# ring.py — "One IBAN, 24 currencies": a Gleec-purple disc with the G at the
# centre (the one account) and the 24 currencies Banking Circle lists orbiting
# it on a tilted ring. GBP, EUR and USD (live at launch) are glossy and in full
# colour at the front; the 21 planned ones are brushed-silver tokens with the
# currency code engraved.
#
#   Blender -b -P art-src/blender/ring.py -- --out art-src/inbox/ring.png [--samples 256]
import bpy, math, os, sys, argparse
from mathutils import Vector, Quaternion

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (HERE, srgb, reset, setup_render, studio, studio_lights, area, camera,
                    image_node, top_uvs, purple_lacquer, render)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(HERE, "..", "inbox", "ring.png"))
ap.add_argument("--samples", type=int, default=256)
ap.add_argument("--width", type=int, default=2400)
ap.add_argument("--height", type=int, default=1600)
args = ap.parse_args(argv)

LIVE = ["GBP", "EUR", "USD"]
# Banking Circle's 24 currencies (Currency Capability sheet), live ones first.
PLANNED = ["CHF", "CAD", "AUD", "JPY", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
           "NZD", "SGD", "HKD", "ZAR", "AED", "SAR", "ILS", "TRY", "MXN", "CNH"]

scene = reset()
setup_render(scene, args.samples, args.width, args.height)


def disc(name, radius, depth):
    bpy.ops.mesh.primitive_cylinder_add(vertices=160, radius=radius, depth=depth)
    ob = bpy.context.active_object
    ob.name = name
    mod = ob.modifiers.new("edge", "BEVEL")
    mod.width = min(depth * 0.35, 0.0006)
    mod.segments = 6
    mod.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="edge")
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    top_uvs(ob, radius * 2, radius * 2)
    return ob


def top_mix(nodes, links):
    """Factor that is 1 on the top face and 0 on the rim (from the surface normal)."""
    geo = nodes.new("ShaderNodeNewGeometry")
    xform = nodes.new("ShaderNodeVectorTransform")
    xform.convert_from = "WORLD"
    xform.convert_to = "OBJECT"
    xform.vector_type = "NORMAL"
    links.new(geo.outputs["Normal"], xform.inputs["Vector"])
    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(xform.outputs["Vector"], sep.inputs["Vector"])
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.85
    ramp.inputs["From Max"].default_value = 0.95
    links.new(sep.outputs["Z"], ramp.inputs["Value"])
    return ramp.outputs["Result"]


def rim_bsdf(nodes, color="#dcdde2"):
    rim = nodes.new("ShaderNodeBsdfPrincipled")
    rim.inputs["Base Color"].default_value = srgb(color)
    rim.inputs["Metallic"].default_value = 1.0
    rim.inputs["Roughness"].default_value = 0.22
    return rim


def puck_material():
    m = bpy.data.materials.new("puck")
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    body = nodes.new("ShaderNodeBsdfPrincipled")
    purple_lacquer(body)
    ink = nodes.new("ShaderNodeBsdfPrincipled")
    ink.inputs["Base Color"].default_value = srgb("#f4f4f6")
    ink.inputs["Roughness"].default_value = 0.45
    mask = image_node(nodes, os.path.join(HERE, "puck_mask.png"))
    face = nodes.new("ShaderNodeMixShader")
    links.new(mask.outputs["Color"], face.inputs["Fac"])
    links.new(body.outputs["BSDF"], face.inputs[1])
    links.new(ink.outputs["BSDF"], face.inputs[2])
    # The rim stays purple lacquer too (it's one object), so only the face gets ink.
    whole = nodes.new("ShaderNodeMixShader")
    links.new(top_mix(nodes, links), whole.inputs["Fac"])
    links.new(body.outputs["BSDF"], whole.inputs[1])
    links.new(face.outputs["Shader"], whole.inputs[2])
    links.new(whole.outputs["Shader"], out.inputs["Surface"])
    return m


def currency_material(code, live):
    m = bpy.data.materials.new(f"cur-{code}")
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    flag = image_node(nodes, os.path.join(HERE, "flags", f"{code}.png"), non_color=False)
    face = nodes.new("ShaderNodeBsdfPrincipled")
    if live:
        links.new(flag.outputs["Color"], face.inputs["Base Color"])
        face.inputs["Roughness"].default_value = 0.35
        face.inputs["Coat Weight"].default_value = 0.8
        face.inputs["Coat Roughness"].default_value = 0.05
    else:
        # Planned: brushed silver with the currency code engraved (no flag yet).
        code_mask = image_node(nodes, os.path.join(HERE, "codes", f"{code}.png"))
        tint = nodes.new("ShaderNodeMixRGB")
        tint.inputs["Color1"].default_value = srgb("#d9dade")
        tint.inputs["Color2"].default_value = srgb("#3a3b41")
        links.new(code_mask.outputs["Color"], tint.inputs["Fac"])
        links.new(tint.outputs["Color"], face.inputs["Base Color"])
        face.inputs["Metallic"].default_value = 1.0
        rough = nodes.new("ShaderNodeMapRange")
        rough.inputs["To Min"].default_value = 0.26
        rough.inputs["To Max"].default_value = 0.55
        links.new(code_mask.outputs["Color"], rough.inputs["Value"])
        links.new(rough.outputs["Result"], face.inputs["Roughness"])
        face.inputs["Anisotropic"].default_value = 0.5
        bump = nodes.new("ShaderNodeBump")
        bump.invert = True
        bump.inputs["Strength"].default_value = 0.6
        bump.inputs["Distance"].default_value = 0.0001
        links.new(code_mask.outputs["Color"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], face.inputs["Normal"])
    rim = rim_bsdf(nodes, "#e2e3e8" if live else "#cfd0d6")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(top_mix(nodes, links), mix.inputs["Fac"])
    links.new(rim.outputs["BSDF"], mix.inputs[1])
    links.new(face.outputs["BSDF"], mix.inputs[2])
    links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


# ---------- layout ----------
cam_loc = Vector((0.0, -0.44, 0.30))
target = Vector((0.0, 0.0, 0.004))


def face_camera(ob, tilt=(0.0, 0.0, 0.0)):
    """Turn a disc's +Z (its face) towards the camera, then add a small tilt."""
    direction = (cam_loc - ob.location).normalized()
    q = direction.to_track_quat("Z", "Y")
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = q @ Quaternion((1, 0, 0), tilt[0]) @ Quaternion((0, 1, 0), tilt[1])


puck = disc("iban", 0.026, 0.008)
puck.data.materials.append(puck_material())
puck.location = (0, 0, 0.006)
face_camera(puck, (math.radians(-24), math.radians(10), 0))

R = 0.084          # ring radius
alpha = math.radians(-3)  # ring nearly horizontal; the camera sees it from ~23° above, like Saturn
u = Vector((1, 0, 0))
v = Vector((0, math.cos(alpha), math.sin(alpha)))
# Slot k sits at angle -90° + k·15° (slot 0 is front centre). GBP front centre,
# EUR to its left (slot 23), USD to its right (slot 1); the planned ones fill the
# rest, nearest the front first.
step = 360 / 24
front = {0: "GBP", 23: "EUR", 1: "USD"}
others = sorted((k for k in range(24) if k not in front), key=lambda k: min(k, 24 - k))
assign = {k: c for k, c in front.items()}
assign.update(zip(others, PLANNED))
assert len(assign) == 24 and len(set(assign.values())) == 24

for k, code in assign.items():
    a = -90 + k * step
    live = code in LIVE
    d = disc(f"cur-{code}", 0.0104 if live else 0.0064, 0.0022)
    d.data.materials.append(currency_material(code, live))
    th = math.radians(a)
    d.location = R * (math.cos(th) * u + math.sin(th) * v)
    face_camera(d, (math.radians(-8 + 10 * math.sin(th * 2)), math.radians(12 * math.cos(th)), 0))

# Focus between the disc and the front (GBP) and stop down: the G and the live
# currencies are both sharp; only the far side of the ring softens.
focus = bpy.data.objects.new("focus", None)
scene.collection.objects.link(focus)
focus.location = (puck.location + bpy.data.objects["cur-GBP"].location) / 2
camera(scene, cam_loc, target, lens=85, fstop=18, focus=focus)
studio(scene)
studio_lights(scene)
# The ring is wider than a card: a soft fill from the right keeps its far side lit.
area(scene, "fill", (0.40, -0.18, 0.30), (0, 0, 0), 0.4, 2.2)
render(scene, os.path.abspath(args.out))
