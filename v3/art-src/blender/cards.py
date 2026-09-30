# cards.py — Blender (Cycles) scene for the Gleec company cards: real card geometry
# (ISO/IEC 7810 ID-1), physically based materials, a studio HDRI plus softbox
# lights, a 100 mm lens with shallow depth of field, and a transparent background
# with a shadow catcher so the render sits on any stage.
#
#   Blender -b -P art-src/blender/cards.py -- --out art-src/inbox/cards.png \
#       [--samples 256] [--width 2400] [--height 1600] [--shot hero]
#
# Units are metres (Blender's default), so the lens, depth of field and light
# falloff behave like a real camera.
import bpy, bmesh, math, os, sys, argparse
from mathutils import Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)  # art-src

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(SRC, "inbox", "cards.png"))
ap.add_argument("--samples", type=int, default=256)
ap.add_argument("--width", type=int, default=2400)
ap.add_argument("--height", type=int, default=1600)
ap.add_argument("--shot", default="hero")
ap.add_argument("--view", default="Standard")  # colour view transform
ap.add_argument("--virtual", action="store_true")  # no chip, no contactless mark
args = ap.parse_args(argv)

# ---------- card dimensions (metres) ----------
W, H, T = 0.0856, 0.05398, 0.0008
R = 0.00318  # corner radius


def srgb(hexstr, a=1.0):
    """#rrggbb (sRGB) to Blender's linear RGBA."""
    h = hexstr.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, a)


# ---------- clean scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- render settings ----------
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == "METAL"
scene.cycles.device = "GPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = args.width
scene.render.resolution_y = args.height
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.view_settings.view_transform = args.view
scene.view_settings.look = "None"
scene.view_settings.exposure = -0.25


# ---------- geometry ----------
def rounded_slab(name, w, h, t, r, edge_bevel):
    """A rounded-rectangle slab centred on the origin, face normal +Z, with UVs
    projected from the top view (u across the width, v up the height)."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, h, t)
    bpy.ops.object.transform_apply(scale=True)
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    vertical = [e for e in bm.edges if abs((e.verts[0].co - e.verts[1].co).normalized().z) > 0.99]
    bmesh.ops.bevel(bm, geom=vertical, offset=r, segments=24, affect="EDGES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    # Soft metal edge: a small angle-limited bevel, smooth shaded.
    mod = ob.modifiers.new("edge", "BEVEL")
    mod.width = edge_bevel
    mod.segments = 5
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(60)
    bpy.ops.object.modifier_apply(modifier="edge")
    bpy.ops.object.shade_smooth()
    # UVs from the top view
    me = ob.data
    # Replace the cube's default unwrap with a top-view projection.
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    uv = me.uv_layers.new(name="UV")
    uv.active = True
    uv.active_render = True
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((co.x + w / 2) / w, (co.y + h / 2) / h)
    return ob


def image_node(nodes, path, non_color=True):
    n = nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(path, check_existing=True)
    if non_color:
        n.image.colorspace_settings.name = "Non-Color"
    return n


def card_material(name, finish):
    """Card body + printed logo and contactless mark (white ink), mixed by mask."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    body = nodes.new("ShaderNodeBsdfPrincipled")
    if finish == "purple":
        # Lacquered satin in Gleec purple: saturated base, glossy clear coat.
        # The studio light lifts it by about 1.5×, so the base sits darker than
        # #8c41ff and the render lands on brand purple (checked by pixel sampling).
        r, g, b, _ = srgb("#8c41ff")
        body.inputs["Base Color"].default_value = (r * 0.62, g * 0.5, b * 0.66, 1.0)
        body.inputs["Metallic"].default_value = 0.0
        body.inputs["Roughness"].default_value = 0.42
        body.inputs["Coat Weight"].default_value = 0.45
        body.inputs["Coat Roughness"].default_value = 0.08
    else:
        # Brushed graphite titanium: metal, anisotropic highlights along the width.
        body.inputs["Base Color"].default_value = srgb("#34353b")
        body.inputs["Metallic"].default_value = 1.0
        body.inputs["Roughness"].default_value = 0.38
        body.inputs["Anisotropic"].default_value = 0.7
        tangent = nodes.new("ShaderNodeTangent")
        tangent.direction_type = "UV_MAP"
        links.new(tangent.outputs["Tangent"], body.inputs["Tangent"])
    ink = nodes.new("ShaderNodeBsdfPrincipled")
    ink.inputs["Base Color"].default_value = srgb("#f4f4f6")
    ink.inputs["Roughness"].default_value = 0.5
    ink.inputs["Metallic"].default_value = 0.0 if finish == "purple" else 0.2
    mask = image_node(nodes, os.path.join(HERE, "print_mask_virtual.png" if args.virtual else "print_mask.png"))
    mix = nodes.new("ShaderNodeMixShader")
    links.new(mask.outputs["Color"], mix.inputs["Fac"])
    links.new(body.outputs["BSDF"], mix.inputs[1])
    links.new(ink.outputs["BSDF"], mix.inputs[2])
    links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def chip_material():
    m = bpy.data.materials.new("chip")
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    gold = nodes.new("ShaderNodeBsdfPrincipled")
    gold.inputs["Base Color"].default_value = srgb("#e3c170")
    gold.inputs["Metallic"].default_value = 1.0
    gold.inputs["Roughness"].default_value = 0.24
    grooves = image_node(nodes, os.path.join(HERE, "chip_grooves.png"))
    # Grooves: darker and rougher, and slightly recessed.
    dark = nodes.new("ShaderNodeMixRGB")
    dark.inputs["Color1"].default_value = srgb("#6b5526")
    dark.inputs["Color2"].default_value = srgb("#e3c170")
    links.new(grooves.outputs["Color"], dark.inputs["Fac"])
    links.new(dark.outputs["Color"], gold.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.4
    bump.inputs["Distance"].default_value = 0.00005
    links.new(grooves.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], gold.inputs["Normal"])
    links.new(gold.outputs["BSDF"], out.inputs["Surface"])
    return m


def make_card(name, finish):
    card = rounded_slab(name, W, H, T, R, edge_bevel=0.00018)
    card.data.materials.append(card_material(f"{name}-mat", finish))
    # ISO 7816 chip: about 12 × 9 mm, 10.25 mm from the left, 19.2 mm from the top.
    if args.virtual:
        return card
    chip = rounded_slab(f"{name}-chip", 0.012, 0.009, 0.0001, 0.0011, edge_bevel=0.00002)
    chip.data.materials.append(chip_material())
    chip.location = (-W / 2 + 0.01025 + 0.006, H / 2 - 0.0192 - 0.0045, T / 2 + 0.00001)
    chip.parent = card
    return card


purple = make_card("card-purple", "purple")
graphite = make_card("card-graphite", "graphite")

# ---------- composition ----------
SHOTS = {
    # Purple card in front, graphite behind: higher, to the right, turned further.
    "hero": {
        "purple": ((-0.012, -0.004, 0.012), (math.radians(50), math.radians(10), math.radians(-14))),
        "graphite": ((0.020, 0.026, 0.026), (math.radians(54), math.radians(16), math.radians(-24))),
        "cam": ((0.0, -0.50, 0.28), (0.004, 0.008, 0.012)),
        "focus": "card-purple",
    },
}
shot = SHOTS[args.shot]
purple.location, purple.rotation_euler = Vector(shot["purple"][0]), Euler(shot["purple"][1])
graphite.location, graphite.rotation_euler = Vector(shot["graphite"][0]), Euler(shot["graphite"][1])

# Shadow catcher floor under the cards.
bpy.ops.mesh.primitive_plane_add(size=1.2, location=(0, 0, -0.03))
floor = bpy.context.active_object
floor.is_shadow_catcher = True

# ---------- camera ----------
cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 100
cam_data.sensor_width = 36
cam_data.dof.use_dof = True
cam_data.dof.aperture_fstop = 4.0
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = Vector(shot["cam"][0])
target = Vector(shot["cam"][1])
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_data.dof.focus_object = bpy.data.objects[shot["focus"]]
scene.camera = cam

# ---------- lighting ----------
world = bpy.data.worlds.new("studio")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wl = world.node_tree.links
wn.clear()
env = wn.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(SRC, "hdri", "studio_small_09_2k.hdr"))
mapping = wn.new("ShaderNodeMapping")
coord = wn.new("ShaderNodeTexCoord")
mapping.inputs["Rotation"].default_value = (0, 0, math.radians(120))
wl.new(coord.outputs["Generated"], mapping.inputs["Vector"])
wl.new(mapping.outputs["Vector"], env.inputs["Vector"])
bg = wn.new("ShaderNodeBackground")
bg.inputs["Strength"].default_value = 0.5
wl.new(env.outputs["Color"], bg.inputs["Color"])
wout = wn.new("ShaderNodeOutputWorld")
wl.new(bg.outputs["Background"], wout.inputs["Surface"])


def area(name, loc, look_at, size, power, color="#ffffff", shape="RECTANGLE", size_y=None, shadow=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.energy = power
    ld.color = srgb(color)[:3]
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    ob.location = Vector(loc)
    ob.rotation_euler = (Vector(look_at) - ob.location).to_track_quat("-Z", "Y").to_euler()
    ld.use_shadow = shadow
    return ob


area("key", (-0.30, -0.22, 0.42), (0, 0, 0), 0.35, 4.0, shape="RECTANGLE", size_y=0.25)
area("rim", (0.32, 0.30, 0.10), (0, 0, 0), 0.5, 3.0, shape="RECTANGLE", size_y=0.04)
# Below the floor, so it must not cast shadows (they would tint the whole catcher).
area("kicker", (0.0, -0.10, -0.25), (0, 0, 0), 0.4, 0.6, color="#8c41ff", shadow=False)

os.makedirs(os.path.dirname(args.out), exist_ok=True)
scene.render.filepath = args.out
bpy.ops.render.render(write_still=True)
print("RENDERED", args.out)
