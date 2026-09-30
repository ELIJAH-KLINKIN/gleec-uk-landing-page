# common.py — the shared Blender studio for every Gleec render: Cycles on the
# Mac's GPU, transparent film, the Poly Haven studio HDRI, softbox lights, a
# shadow-catcher floor, a real-lens camera and the brand materials. Scenes
# (cards.py, ring.py…) import this so all renders read as one set.
import bpy, bmesh, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)  # art-src


def srgb(hexstr, a=1.0):
    """#rrggbb (sRGB) to Blender's linear RGBA."""
    h = hexstr.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, a)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def setup_render(scene, samples, width, height, view="Standard", exposure=-0.25):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == "METAL"
    scene.cycles.device = "GPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = view
    scene.view_settings.look = "None"
    scene.view_settings.exposure = exposure


def studio(scene, hdri="studio_small_09_2k.hdr", strength=0.5, rotation=120):
    world = bpy.data.worlds.new("studio")
    scene.world = world
    world.use_nodes = True
    wn, wl = world.node_tree.nodes, world.node_tree.links
    wn.clear()
    env = wn.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(SRC, "hdri", hdri))
    mapping = wn.new("ShaderNodeMapping")
    coord = wn.new("ShaderNodeTexCoord")
    mapping.inputs["Rotation"].default_value = (0, 0, math.radians(rotation))
    wl.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    wl.new(mapping.outputs["Vector"], env.inputs["Vector"])
    bg = wn.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    wl.new(env.outputs["Color"], bg.inputs["Color"])
    wout = wn.new("ShaderNodeOutputWorld")
    wl.new(bg.outputs["Background"], wout.inputs["Surface"])


def area(scene, name, loc, look_at, size, power, color="#ffffff", size_y=None, shadow=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size = size
    ld.size_y = size_y or size
    ld.energy = power
    ld.color = srgb(color)[:3]
    ld.use_shadow = shadow
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    ob.location = Vector(loc)
    ob.rotation_euler = (Vector(look_at) - ob.location).to_track_quat("-Z", "Y").to_euler()
    return ob


def studio_lights(scene):
    """Softbox key from the top left, a strip rim light behind right, and a faint
    Gleec-purple kicker from below (no shadows: it sits under the floor)."""
    area(scene, "key", (-0.30, -0.22, 0.42), (0, 0, 0), 0.35, 4.0, size_y=0.25)
    area(scene, "rim", (0.32, 0.30, 0.10), (0, 0, 0), 0.5, 3.0, size_y=0.04)
    area(scene, "kicker", (0.0, -0.10, -0.25), (0, 0, 0), 0.4, 0.6, color="#8c41ff", shadow=False)


def shadow_floor(z=-0.03, size=1.2):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    floor = bpy.context.active_object
    floor.is_shadow_catcher = True
    return floor


def camera(scene, loc, target, lens=100, fstop=4.0, focus=None):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_width = 36
    cd.dof.use_dof = focus is not None
    cd.dof.aperture_fstop = fstop
    cam = bpy.data.objects.new("cam", cd)
    scene.collection.objects.link(cam)
    cam.location = Vector(loc)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    if focus is not None:
        cd.dof.focus_object = focus
    scene.camera = cam
    return cam


def image_node(nodes, path, non_color=True):
    n = nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(path, check_existing=True)
    if non_color:
        n.image.colorspace_settings.name = "Non-Color"
    return n


def top_uvs(ob, w, h):
    """Replace the default unwrap with a top-view projection (u across, v up)."""
    me = ob.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    uv = me.uv_layers.new(name="UV")
    uv.active = True
    uv.active_render = True
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((co.x + w / 2) / w, (co.y + h / 2) / h)


def purple_lacquer(body):
    """Gleec purple under a clear coat. The studio lifts it by about 1.5×, so the
    base sits darker than #8c41ff and the render lands on brand purple."""
    r, g, b, _ = srgb("#8c41ff")
    body.inputs["Base Color"].default_value = (r * 0.62, g * 0.5, b * 0.66, 1.0)
    body.inputs["Metallic"].default_value = 0.0
    body.inputs["Roughness"].default_value = 0.42
    body.inputs["Coat Weight"].default_value = 0.45
    body.inputs["Coat Roughness"].default_value = 0.08


def render(scene, out):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("RENDERED", out)
