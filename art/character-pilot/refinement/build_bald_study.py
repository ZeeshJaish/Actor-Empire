"""Second character study: reference-led silhouette, graphic face, crossed arms.

Standalone Blender geometry; keeps the earlier modular pilot intact.
Use Blender 5.1.1 --background --python this_file.py.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
OUTLINED=bpy.data.collections.new('Silhouette geometry')
bpy.context.scene.collection.children.link(OUTLINED)

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h): return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def mat(name,h):
    m=bpy.data.materials.new(name)
    color=rgb(h)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    n=m.node_tree.nodes;n.clear()
    output=n.new('ShaderNodeOutputMaterial')
    emission=n.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value=(*color,1)
    emission.inputs['Strength'].default_value=1
    m.node_tree.links.new(emission.outputs['Emission'],output.inputs['Surface'])
    return m

INK=mat('Ink outlines','101115')
SKIN=mat('Skin ochre','B9754C')
SKIN_LIGHT=mat('Skin highlight','C98658')
SKIN_SHADE=mat('Skin deep plane','A05A3D')
SKIN_RED=mat('Cheek warm plane','AB6042')
SKIN_PALE=mat('Hand top planes','CD8B5F')
BEARD=mat('Five o clock shadow','75645A')
BEARD_DARK=mat('Beard side plane','5D514B')
STUBBLE=mat('Stubble marks','403A36')
JACKET=mat('Bomber slate','303B4E')
JACKET_LIGHT=mat('Bomber top planes','3D4A60')
JACKET_SHADE=mat('Bomber shadow','222B3A')
JACKET_DEEP=mat('Bomber deepest seams','1A2230')
SHIRT=mat('Shirt stone grey','8D8A85')
SHIRT_SHADE=mat('Shirt shadow','706F6D')
DENIM=mat('Trousers indigo','294766')
DENIM_SHADOW=mat('Trousers shade','20344B')
BOOT=mat('Boots charcoal','25272D')
PAPER=mat('Paper backdrop','F4F1EC')
CONTACT=mat('Ground contact','D3D0CB')

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
ROOT=empty('Bald_actor_study_v2')
HEAD=empty('Head_assembly',ROOT)
BODY=empty('Body_assembly',ROOT)
LEFT=empty('Arm_under',ROOT)
RIGHT=empty('Arm_over',ROOT)

def mesh(name,verts,faces,material,parent=ROOT,palette=None):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    # Consistent outside normals are essential for silhouette line rendering.
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);OUTLINED.objects.link(o);o.parent=parent
    d.materials.append(material)
    if palette:
        for m in palette:d.materials.append(m)
        d.update()
        for p in d.polygons:
            # Author a restrained three-tone surface; no soft specular highlights.
            if p.normal.x>.52:p.material_index=2
            elif p.normal.z>.42:p.material_index=1
    return o

def prism(name,poly,front,depth,material,parent=ROOT,palette=None):
    count=len(poly)
    verts=[(x,front,z) for x,z in poly]+[(x,front+depth,z) for x,z in poly]
    faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    return mesh(name,verts,faces,material,parent,palette)

def flat(name,poly,y,material,parent=ROOT):
    # Very shallow graphic face planes; still editable mesh geometry.
    o=prism(name,poly,y,.004,material,parent)
    OUTLINED.objects.unlink(o)
    return o

def line(name,coords,width=.011,parent=ROOT,material=INK):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=1
    d.bevel_depth=width;d.bevel_resolution=0;d.resolution_u=1
    s=d.splines.new('POLY');s.points.add(len(coords)-1)
    for p,co in zip(s.points,coords):p.co=(*co,1)
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(material)
    return o

def volume(name,rings,material,parent=ROOT,palette=None,sides=12):
    verts=[]
    # rings are (center-x, center-y, z, half-width, half-depth).
    for cx,cy,z,w,d in rings:
        verts.extend((cx+math.sin(a*2*math.pi/sides)*w,cy-math.cos(a*2*math.pi/sides)*d,z) for a in range(sides))
    faces=[tuple(range(sides-1,-1,-1))]
    for j in range(len(rings)-1):
        for i in range(sides): faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    faces.append(tuple(range((len(rings)-1)*sides,len(rings)*sides)))
    return mesh(name,verts,faces,material,parent,palette)

def sleeve(name,points,radii,parent):
    verts=[];sides=12
    for i,point in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        # Cross sections are stable along the gesture instead of assembled cuboids.
        axis=tangent.cross(Vector((0,-1,0))).normalized()
        second=tangent.cross(axis).normalized()
        for k in range(sides):
            a=2*math.pi*k/sides
            p=Vector(point)+axis*math.cos(a)*radii[i]+second*math.sin(a)*radii[i]*.86
            verts.append(tuple(p))
    faces=[tuple(range(sides-1,-1,-1))]
    for j in range(len(points)-1):
        for k in range(sides):faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
    faces.append(tuple(range((len(points)-1)*sides,len(points)*sides)))
    return mesh(name,verts,faces,JACKET,parent,[JACKET_LIGHT,JACKET_SHADE])

# Silhouette: very short legs below a broad, rounded jacket, with an oversized jaw.
for s,label in [(-1,'L'),(1,'R')]:
    prism('Trouser '+label,[(s*.10,.12),(s*.57,.12),(s*.57,.64),(s*.09,.64)],-.12,.49,DENIM,BODY,[DENIM,DENIM_SHADOW])
    prism('Boot '+label,[(s*.08,.025),(s*.60,.025),(s*.60,.22),(s*.49,.26),(s*.12,.26)],-.27,.65,BOOT,BODY)
    flat('Boot sole '+label,[(s*.08,.025),(s*.60,.025),(s*.60,.075),(s*.08,.075)],-.279,INK,BODY)

volume('Tailored bomber body',[(0,.06,.50,.69,.35),(0,.04,.66,.79,.40),(0,.04,1.14,.92,.47),(0,.04,1.57,.90,.46),(0,.04,1.92,.64,.33),(0,.03,2.03,.37,.25)],JACKET,BODY,[JACKET_LIGHT,JACKET_SHADE],16)
prism('Tee front panel',[(-.20,.53),(.23,.53),(.23,1.85),(.10,2.01),(-.18,1.99),(-.25,1.82)],-.453,.015,SHIRT,BODY)
flat('Shirt shadow',[(-.20,.53),(-.11,.53),(-.11,1.95),(-.18,1.99),(-.25,1.82)],-.474,SHIRT_SHADE,BODY)
prism('Hem left',[(-.68,.50),(-.20,.50),(-.20,.67),(-.75,.67)],-.35,.14,JACKET_SHADE,BODY)
prism('Hem right',[(.23,.50),(.67,.50),(.74,.67),(.23,.67)],-.35,.14,JACKET_SHADE,BODY)
line('Jacket zip',[(-.20,-.482,.54),(-.20,-.482,1.86)],.012,BODY)
line('Jacket right seam',[(.24,-.482,.54),(.24,-.482,1.89)],.012,BODY)
line('Left pocket',[(-.61,-.343,.72),(-.61,-.44,.98)],.014,BODY)
line('Right pocket',[(.62,-.343,.72),(.64,-.425,.92)],.014,BODY)
for s in [-1,1]:
    prism('Raised collar '+str(s),[(s*.14,1.83),(s*.58,1.86),(s*.39,2.06),(s*.24,2.07)],-.36,.23,JACKET_SHADE,BODY)
    for k in range(6):
        x=s*(.28+k*.07)
        line('Hem rib',[(x,-.51,.51),(x,-.51,.64)],.008,BODY)

# One continuous, rounded upper arm per side and substantial overlapping forearms.
sleeve('Under arm shoulder to elbow',[(-.67,.025,1.81),(-.87,-.015,1.61),(-1.00,-.20,1.23),(-.90,-.37,1.02)],[.27,.31,.31,.27],LEFT)
sleeve('Under forearm',[(-.91,-.60,1.12),(-.69,-.89,1.11),(-.29,-1.03,1.22),(.12,-1.06,1.40),(.39,-1.01,1.49)],[.27,.28,.265,.23,.195],LEFT)
prism('Visible right cuff',[(.20,1.31),(.43,1.33),(.49,1.69),(.27,1.70)],-1.26,.21,JACKET_SHADE,LEFT)
for k in range(4):
    z=1.37+k*.075
    line('Cuff rib',[(.24,-1.275,z),(.45,-1.275,z+.015)],.009,LEFT)
prism('Hidden tucked hand',[(.44,1.35),(.66,1.39),(.70,1.52),(.62,1.68),(.46,1.68)],-1.18,.23,SKIN,LEFT,[SKIN_PALE,SKIN_SHADE])

sleeve('Over arm shoulder to elbow',[(.66,.035,1.81),(.87,-.02,1.64),(1.015,-.20,1.25),(.92,-.50,1.12)],[.27,.31,.30,.255],RIGHT)
sleeve('Over forearm',[(.94,-.49,1.11),(.73,-.57,1.19),(.28,-.60,1.42),(-.19,-.61,1.63),(-.45,-.66,1.72)],[.255,.28,.255,.23,.20],RIGHT)
prism('Folded sleeve cuff',[(-.58,1.68),(-.31,1.56),(-.17,1.82),(-.44,1.94)],-.985,.20,JACKET_SHADE,RIGHT)
prism('Visible folded hand',[(-.72,1.80),(-.58,1.69),(-.43,1.70),(-.27,1.89),(-.36,1.99),(-.49,2.025),(-.64,1.98)],-1.008,.21,SKIN,RIGHT,[SKIN_PALE,SKIN_SHADE])
line('Finger separation one',[(-.63,-1.018,1.92),(-.49,-1.02,1.82),(-.40,-1.02,1.83)],.012,RIGHT)
line('Finger separation two',[(-.55,-1.018,1.99),(-.41,-1.02,1.90),(-.34,-1.02,1.91)],.012,RIGHT)
line('Cuff stitch',[(-.54,-1.001,1.69),(-.34,-1.001,1.61)],.009,RIGHT)
line('Forearm crease',[(-.74,-1.03,1.41),(-.62,-1.14,1.48),(-.53,-1.17,1.48)],.011,LEFT)

# A designed, asymmetric front profile. No large cube with eyes glued onto it.
face_outline=[(-.51,1.96),(.51,1.91),(.60,2.06),(.60,3.17),(.45,3.36),(-.45,3.40),(-.63,3.22),(-.63,2.65),(-.51,2.52)]
head=prism('Designed head volume',face_outline,-.535,.58,SKIN,HEAD,[SKIN_LIGHT,SKIN_SHADE])
for vertex in head.data.vertices[len(face_outline):]:
    vertex.co.x*=.88
    vertex.co.z=2.65+(vertex.co.z-2.65)*.94
head.data.update()
flat('Forehead light plane',[(-.43,3.38),(.43,3.34),(.57,3.18),(.28,3.15),(.15,3.30),(-.27,3.32)],-.541,SKIN_LIGHT,HEAD)
flat('Temple warm plane',[(-.61,3.21),(-.38,3.08),(-.39,2.87),(-.29,2.74),(-.39,2.53),(-.51,2.53),(-.61,2.65)],-.547,SKIN_RED,HEAD)
flat('Nose side facial plane',[(.05,2.97),(.17,2.98),(.19,2.46),(.04,2.44),(-.03,2.55)],-.542,SKIN_SHADE,HEAD)

# Broad coloured jaw/shaving shadow, with sparse flat marks rather than protruding cubes.
flat('Beard jaw plane',[(-.505,1.966),(.505,1.916),(.595,2.06),(.595,2.45),(.12,2.43),(-.09,2.49),(-.39,2.46),(-.515,2.53)],-.552,BEARD,HEAD)
flat('Beard left plane',[(-.505,1.966),(-.32,1.957),(-.32,2.445),(-.39,2.46),(-.515,2.53)],-.558,BEARD_DARK,HEAD)
beard_side=mesh('Beard left side',[(-.517,-.538,1.96),(-.517,-.538,2.51),(-.456,.05,2.51),(-.456,.05,2.002)],[(0,1,2,3)],BEARD_DARK,HEAD)
OUTLINED.objects.unlink(beard_side)
line('Jaw front outline',[(-.515,-.574,2.50),(-.51,-.574,1.96),(.51,-.574,1.91),(.60,-.574,2.06),(.60,-.574,2.45)],.012,HEAD)
for x,z,w in [(-.39,2.31,.022),(-.24,2.20,.019),(-.37,2.06,.022),(-.10,2.04,.022),(.23,2.32,.018),(.36,2.14,.019),(.12,2.04,.019),(.43,2.36,.020),(-.10,2.36,.015)]:
    flat('Graphic stubble',[(x,z),(x+w,z),(x+w,z+.026),(x,z+.03)],-.565,STUBBLE,HEAD)

prism('Left ear',[(-.62,2.53),(-.77,2.57),(-.82,2.71),(-.75,2.83),(-.60,2.84)],-.30,.24,SKIN,HEAD,[SKIN_LIGHT,SKIN_SHADE])
line('Ear inner fold',[(-.69,-.325,2.62),(-.74,-.325,2.65),(-.75,-.325,2.73),(-.69,-.325,2.75)],.015,HEAD)
prism('Right ear',[(.57,2.52),(.64,2.58),(.65,2.73),(.62,2.83),(.59,2.82)],-.12,.18,SKIN_SHADE,HEAD)

# Tiny black eyes tucked under large brows. The exact graphic language of the reference.
flat('Left eye',[(-.245,2.71),(-.145,2.70),(-.145,2.85),(-.25,2.86)],-.571,INK,HEAD)
flat('Right eye',[(.27,2.69),(.365,2.69),(.365,2.86),(.27,2.86)],-.571,INK,HEAD)
prism('Heavy left brow',[(-.43,2.86),(-.075,2.81),(-.065,3.01),(-.435,3.065)],-.603,.065,INK,HEAD)
prism('Heavy right brow',[(.155,2.82),(.51,2.86),(.505,3.045),(.15,3.025)],-.603,.065,INK,HEAD)
for name in ['Heavy left brow','Heavy right brow']:
    OUTLINED.objects.unlink(bpy.data.objects[name])

mesh('Angular nose',[(-.025,-.55,2.88),(.105,-.55,2.89),(-.105,-.76,2.49),(.14,-.74,2.485),(.15,-.55,2.48)],[(0,1,3,2),(1,4,3),(2,3,4),(0,2,4,1)],SKIN,HEAD,[SKIN_LIGHT,SKIN_SHADE])
OUTLINED.objects.unlink(bpy.data.objects['Angular nose'])
line('Nose graphic edge',[(-.025,-.562,2.87),(-.105,-.773,2.49),(.14,-.753,2.485)],.013,HEAD)
flat('Deadpan mouth',[(-.05,2.255),(.20,2.26),(.19,2.217),(-.07,2.22)],-.578,INK,HEAD)

# A single static art study. Small yaw views below prove volume without promising a full rig.
bpy.context.view_layer.update()
worlds={o:o.matrix_world.copy() for o in HEAD.children}
HEAD.location=(0,0,1.94)
bpy.context.view_layer.update()
for o,m in worlds.items():o.matrix_world=m

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=False
scene.cycles.device='CPU'
scene.render.resolution_x=1100;scene.render.resolution_y=1300
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.world=bpy.data.worlds.new('Paper world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(*rgb('F4F1EC'),1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=1

# Geometry beneath the feet is the graphic contact shadow, avoiding studio-photo lighting.
verts=[(math.cos(i*math.tau/64)*1.03,math.sin(i*math.tau/64)*.47,-.012) for i in range(64)]
shadow=mesh('Ground contact ellipse',verts,[tuple(range(64))],CONTACT,None)
OUTLINED.objects.unlink(shadow)

bpy.ops.object.camera_add(location=(-2.7,-12,3.0))
camera=bpy.context.object;camera.name='Reference study camera';camera.data.type='ORTHO';camera.data.ortho_scale=4.25
def aim(target):camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
aim((0,-.05,1.75));scene.camera=camera

scene.render.use_freestyle=True
fs=bpy.context.view_layer.freestyle_settings
fs.crease_angle=math.radians(120)
lineset=fs.linesets[0]
lineset.select_by_collection=True
lineset.collection=OUTLINED
lineset.collection_negation='INCLUSIVE'
lineset.select_silhouette=True
lineset.select_border=True
lineset.select_crease=False
lineset.select_edge_mark=False
lineset.select_material_boundary=False
lineset.select_external_contour=True
if lineset.linestyle is None:
    lineset.linestyle=bpy.data.linestyles.new('Bold character contour')
style=lineset.linestyle;style.color=(.003,.003,.004);style.thickness=6.0
style.caps='ROUND'

source=OUT/'bald-actor-study-v2.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
scene.render.filepath=str(OUT/'renders/bald-actor-v2.png')
bpy.ops.render.render(write_still=True)
camera.location=(-2.25,-10,3.05);aim((0,-.05,2.68));camera.data.ortho_scale=2.18
scene.render.resolution_x=900;scene.render.resolution_y=900
scene.render.filepath=str(OUT/'renders/bald-actor-v2-portrait.png')
bpy.ops.render.render(write_still=True)
print('REFERENCE_STUDY_RENDERED',str(source),flush=True)
