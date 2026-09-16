"""Actor Empire modular character art pilot. Run with Blender 5.1 --background --python.

Original geometry built locally; no generated raster art or downloaded character parts.
Axes: Blender Z up, character faces -Y. glTF exporter converts to Y up.
Every interchangeable group has category/option metadata for the preview.
"""
import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parent
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, roughness=0.85):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

INK = material('Ink', (0.014, 0.020, 0.028))
SKIN = material('Skin', (0.57, 0.245, 0.105))
SKIN_DARK = material('Skin shadow', (0.37, 0.12, 0.058))
HAIR = material('Hair', (0.025, 0.022, 0.025))
HAIR_LIGHT = material('Hair edge', (0.055, 0.046, 0.046))
JACKET = material('Jacket navy', (0.044, 0.072, 0.12))
JACKET_LIGHT = material('Jacket lapels', (0.075, 0.12, 0.19))
SHIRT = material('Shirt warm ivory', (0.73, 0.66, 0.51))
PANTS = material('Trousers', (0.035, 0.046, 0.074))
SHOES = material('Boot leather', (0.025, 0.029, 0.037), 0.55)
EYE = material('Eye whites', (0.83, 0.80, 0.7))
GOLD = material('Antique brass', (0.42, 0.28, 0.085), 0.4)

def empty(name, parent=None, **props):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for k,v in props.items(): obj[k] = v
    return obj

ROOT = empty('ActorEmpire_Character', assetVersion=1, artStyle='bold-cartoon-pilot')
HEAD = empty('HeadPivot', ROOT)

def mesh(name, vertices, faces, mat, parent=ROOT, bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Tiny edge chamfer', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
    return obj

def box(name, loc, size, mat, parent=ROOT, bevel=0.025, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler = rotation
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Edge chamfer', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
    return obj

def shape(name, polygon, y_front, depth, mat, parent=ROOT, bevel=0):
    """Extrude a front-view (x,z) polygon. Keeps shape language explicit."""
    n = len(polygon)
    verts = [(x,y_front,z) for x,z in polygon] + [(x,y_front+depth,z) for x,z in polygon]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    # Polygon coordinates below are clockwise when viewed along +Y; correct winding
    # consistently using signed area in x/z before constructing the prism.
    area = sum(polygon[i][0]*polygon[(i+1)%n][1] - polygon[(i+1)%n][0]*polygon[i][1] for i in range(n))
    if area > 0:
        faces = [tuple(reversed(f)) for f in faces]
    return mesh(name, verts, faces, mat, parent, bevel)

def ring_head(name, rings, mat, parent):
    verts=[]
    for z,w,d in rings:
        verts += [(x,y,z) for x,y in [(-w*.76,-d),(w*.76,-d),(w,-d*.60),(w,d*.60),(w*.76,d),(-w*.76,d),(-w,d*.60),(-w,-d*.60)]]
    faces=[tuple(range(7,-1,-1))]
    for j in range(len(rings)-1):
        for i in range(8): faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    faces.append(tuple(range((len(rings)-1)*8,len(rings)*8)))
    return mesh(name,verts,faces,mat,parent)

def part(category, option, parent=HEAD):
    return empty(f'part_{category}_{option}', parent, category=category, option=option)

# Shared silhouette: compact body, oversized rectangular head, heavy shoes.
box('Neck', (0,0,1.82), (.48,.49,.45), SKIN, bevel=.07)
shape('Jacket silhouette', [(-.57,.70),(.57,.70),(.70,1.48),(.52,1.73),(-.52,1.73),(-.70,1.48)], -.29,.67,JACKET,bevel=.055)
shape('Shirt panel', [(-.25,.82),(.25,.82),(.30,1.60),(.20,1.78),(-.20,1.78),(-.30,1.60)], -.345,.075,SHIRT,bevel=.008)
for s,label in [(-1,'L'),(1,'R')]:
    shape('Lapel '+label, [(s*.20,1.72),(s*.51,1.62),(s*.40,1.39),(s*.48,1.34),(s*.14,1.06),(s*.24,1.49)], -.43,.10,JACKET_LIGHT,bevel=.008)
    arm = box('Sleeve '+label,(s*.73,.035,1.23),(.38,.58,.78),JACKET,bevel=.065,rotation=(0,s*-.13,0))
    box('Cuff '+label,(s*.78,-.005,.91),(.36,.55,.13),JACKET_LIGHT,bevel=.018)
    box('Hand '+label,(s*.80,-.035,.75),(.32,.40,.30),SKIN,bevel=.06)
    box('Thumb '+label,(s*.65,-.17,.80),(.14,.21,.19),SKIN,bevel=.025)
    for finger in range(2):
        box('Knuckle line '+label+str(finger),(s*.8+(finger-.5)*.07,-.242,.72),(.014,.012,.105),SKIN_DARK,bevel=0)
    box('Trouser '+label,(s*.29,.055,.49),(.49,.58,.55),PANTS,bevel=.025)
    box('Boot '+label,(s*.30,-.075,.155),(.51,.83,.25),SHOES,bevel=.05)
    box('Sole '+label,(s*.30,-.075,.055),(.53,.84,.085),INK,bevel=.012)
box('Belt',(0,-.347,.80),(1.07,.09,.13),INK,bevel=.008)
box('Belt buckle',(0,-.408,.80),(.18,.045,.13),GOLD,bevel=.012)
box('Buckle inset',(0,-.435,.80),(.10,.012,.065),INK,bevel=.005)
for z in [.97,1.15]: box('Jacket button '+str(z),(.31,-.445,z),(.055,.018,.065),INK,bevel=.01)
shape('Pocket welt',[(-.52,1.16),(-.34,1.16),(-.34,1.19),(-.52,1.19)],-.378,.02,INK)

# Same crown/eye sockets for all heads; lower jaw geometry carries the variation.
heads = {
    'square': [(1.78,.47,.40),(1.88,.64,.49),(2.87,.64,.49),(3.08,.48,.37)],
    'round': [(1.78,.35,.39),(1.97,.60,.49),(2.42,.69,.49),(2.87,.63,.49),(3.08,.48,.37)],
    'tapered': [(1.78,.27,.37),(1.91,.41,.49),(2.46,.63,.49),(2.87,.64,.49),(3.08,.48,.37)],
}
for option,rings in heads.items():
    parent = part('face',option)
    ring_head('Head '+option,rings,SKIN,parent)

# Ears and all facial features share one attachment layout, independent of face choice.
for s,label in [(-1,'L'),(1,'R')]:
    box('Ear '+label,(s*.65,-.045,2.43),(.25,.28,.36),SKIN,HEAD,bevel=.07)
    box('Ear inset '+label,(s*.708,-.195,2.44),(.085,.025,.16),SKIN_DARK,HEAD,bevel=.027)
    box('Eye socket '+label,(s*.28,-.504,2.51),(.28,.035,.155),INK,HEAD,bevel=.012)
    box('Eye white '+label,(s*.28,-.532,2.50),(.235,.019,.113),EYE,HEAD,bevel=.003)
    box('Pupil '+label,(s*.245,-.548,2.503),(.095,.02,.117),INK,HEAD,bevel=.003)
    box('Eye glint '+label,(s*.245-.016,-.562,2.527),(.021,.008,.024),EYE,HEAD,bevel=0)

mesh('Nose', [(-.09,-.49,2.59),(.09,-.49,2.59),(-.105,-.49,2.26),(.105,-.49,2.26),(-.065,-.70,2.29),(.09,-.70,2.29)], [(0,1,5,4),(0,4,2),(1,3,5),(2,4,5,3),(0,2,3,1)], SKIN, HEAD)
shape('Nose shadow',[(-.065,2.29),(.09,2.29),(.105,2.26),(-.105,2.26)],-.705,.014,SKIN_DARK,HEAD)
shape('Mouth',[(-.19,2.11),(.18,2.14),(.18,2.09),(-.19,2.07)],-.508,.025,INK,HEAD)
shape('Lower lip',[(-.10,2.025),(.13,2.044),(.14,2.069),(-.11,2.055)],-.51,.012,SKIN_DARK,HEAD)
for x,z in [(-.20,2.06),(.22,2.06),(-.27,2.13),(.28,2.14),(-.15,2.00),(.12,2.0),(0,2.03)]:
    box('Stubble',(x,-.497,z),(.023,.015,.033),SKIN_DARK,HEAD,bevel=.002)

for option in ['straight','angled','arched']:
    parent=part('brows',option)
    for s,label in [(-1,'L'),(1,'R')]:
        if option=='straight':
            poly=[(.115,2.60),(.49,2.63),(.49,2.79),(.115,2.77)]
        elif option=='angled':
            poly=[(.10,2.59),(.49,2.72),(.49,2.85),(.10,2.75)]
        else:
            poly=[(.105,2.63),(.30,2.75),(.49,2.65),(.49,2.78),(.30,2.9),(.105,2.77)]
        shape('Brow '+option+label,[(s*x,z) for x,z in poly],-.59,.085,HAIR,parent,bevel=.008)

part('hair','bald')
crop=part('hair','crop')
ring_head('Crop crown',[(2.90,.655,.50),(3.10,.64,.48),(3.20,.45,.34)],HAIR,crop)
for s,label in [(-1,'L'),(1,'R')]:
    box('Crop side '+label,(s*.617,.10,2.79),(.11,.67,.39),HAIR,crop,bevel=.025)
    shape('Crop sideburn '+label,[(s*.52,2.95),(s*.65,2.92),(s*.65,2.49),(s*.57,2.53)],-.35,.30,HAIR,crop)
for i,(x,h) in enumerate([(-.42,.15),(-.15,.25),(.14,.30),(.40,.23)]):
    shape('Crop quiff '+str(i),[(x-.15,3.07),(x+.18,3.04),(x+.23,3.18+h),(x+.03,3.25+h),(x-.12,3.22+h)],-.44,.52,HAIR if i%2==0 else HAIR_LIGHT,crop,bevel=.009)

swept=part('hair','swept')
ring_head('Swept crown',[(2.93,.66,.50),(3.16,.60,.45),(3.26,.37,.30)],HAIR,swept)
shape('Swept left lock',[(-.63,3.10),(-.37,3.23),(-.35,2.79),(-.57,2.50),(-.57,2.17),(-.81,2.30),(-.76,2.81)],-.39,.79,HAIR,swept,bevel=.012)
shape('Swept right lock',[(.44,3.16),(.65,3.08),(.81,2.35),(.57,2.18),(.59,2.69),(.38,2.91)],-.31,.71,HAIR,swept,bevel=.012)
shape('Swept fringe',[(-.62,3.04),(-.29,3.33),(.29,3.32),(.54,3.17),(.10,3.03),(-.29,2.99),(-.42,3.00)],-.57,.32,HAIR,swept,bevel=.009)
shape('Fringe highlight',[(-.48,3.02),(-.24,3.23),(.25,3.23),(.03,3.15),(-.28,3.02)],-.584,.009,HAIR_LIGHT,swept)

# Move head pivot to neck without changing any mesh's world transform.
bpy.context.view_layer.update()
children = list(HEAD.children)
worlds={obj.name:obj.matrix_world.copy() for obj in children}
HEAD.location=(0,0,1.78)
bpy.context.view_layer.update()
for obj in children: obj.matrix_world=worlds[obj.name]

def apply_recipe(face='square',hair='bald',brows='straight'):
    for obj in bpy.data.objects:
        if 'category' in obj:
            active = obj['option'] == {'face':face,'hair':hair,'brows':brows}[obj['category']]
            for descendant in [obj,*obj.children_recursive]:
                descendant.hide_render=not active
                descendant.hide_set(not active)
    bpy.context.view_layer.update()

# A simple rigid head-turn proves the assembled parts stay together. Full body rig is future work.
HEAD.rotation_mode='XYZ'
for frame,angle in [(1,0),(18,-.28),(36,0),(54,.28),(72,0)]:
    HEAD.rotation_euler[2]=angle
    HEAD.keyframe_insert(data_path='rotation_euler',frame=frame)
if HEAD.animation_data and HEAD.animation_data.action: HEAD.animation_data.action.name='LookAround'

scene=bpy.context.scene
scene.frame_start=1
scene.frame_end=72
scene.render.fps=24
scene.frame_set(1)
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=900
scene.render.resolution_y=1050
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('Studio')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.34,.40,.48,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'

def point_at(obj, target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc;point_at(obj,(0,0,1.8))
area('Key softbox',(-3,-5,6),420,(1,.85,.69),4)
area('Fill softbox',(4,-2,3),210,(.69,.82,1),3)
area('Rim',(2,3,4),470,(1,.75,.47),3)
GROUND=material('Backdrop',(.69,.72,.71))
box('Studio floor',(0,0,-.035),(200,200,.04),GROUND,parent=None,bevel=0)
bpy.ops.object.camera_add(location=(4,-10,4.7))
camera=bpy.context.object;camera.name='PortraitCamera';camera.data.type='ORTHO';camera.data.ortho_scale=4.1
point_at(camera,(0,0,1.65));scene.camera=camera

# Export ALL modular nodes. Visibility is selected by recipes, not baked into the GLB.
for obj in bpy.data.objects: obj.hide_set(False);obj.hide_render=False
bpy.ops.object.select_all(action='DESELECT')
for obj in [ROOT,*ROOT.children_recursive]: obj.select_set(True)
bpy.context.view_layer.objects.active=ROOT
bpy.ops.export_scene.gltf(filepath=str(BASE/'exports/actor-empire-character.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=True)

recipes=[{'version':1,'face':f,'hair':h,'brows':b} for f in heads for h in ['bald','crop','swept'] for b in ['straight','angled','arched']]
(BASE/'exports/recipes.json').write_text(json.dumps(recipes,indent=2))
apply_recipe('square','bald','straight')
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'actor-empire-character-pilot.blend'))

if '--no-render' not in ARGS:
    scene.render.filepath=str(BASE/'renders/first-character.png')
    bpy.ops.render.render(write_still=True)
if '--gallery' in ARGS:
    scene.render.resolution_x=420;scene.render.resolution_y=490
    scene.cycles.samples=16
    for recipe in recipes:
        apply_recipe(**{k:v for k,v in recipe.items() if k!='version'})
        scene.render.filepath=str(BASE/'renders'/f"{recipe['face']}-{recipe['hair']}-{recipe['brows']}.png")
        bpy.ops.render.render(write_still=True)
if '--review' in ARGS:
    scene.frame_set(1)
    copies=[]
    original=[ROOT,*ROOT.children_recursive]
    for idx,recipe in enumerate([('square','bald','straight'),('round','crop','angled'),('tapered','swept','arched')]):
        lookup={}
        for obj in original:
            copy=obj.copy()
            bpy.context.collection.objects.link(copy)
            lookup[obj]=copy
        for obj,copy in lookup.items():
            if obj.parent in lookup: copy.parent=lookup[obj.parent]
        new_root=lookup[ROOT]
        new_root.location.x=(idx-1)*2.5
        for obj in [new_root,*new_root.children_recursive]:
            if 'category' in obj:
                active=obj['option']==dict(zip(['face','hair','brows'],recipe))[obj['category']]
                for child in [obj,*obj.children_recursive]: child.hide_render=not active
        copies.append(new_root)
    for obj in original: obj.hide_render=True
    camera.location=(3.2,-15,6)
    point_at(camera,(0,0,1.67))
    camera.data.ortho_scale=8.35
    scene.render.resolution_x=1800;scene.render.resolution_y=1000
    scene.cycles.samples=48
    scene.render.filepath=str(BASE/'renders/character-lineup.png')
    bpy.ops.render.render(write_still=True)
print('CHARACTER_PILOT_COMPLETE',json.dumps({'combinations':len(recipes),'meshObjects':len([x for x in ROOT.children_recursive if x.type=='MESH']),'glbBytes':(BASE/'exports/actor-empire-character.glb').stat().st_size}),flush=True)
