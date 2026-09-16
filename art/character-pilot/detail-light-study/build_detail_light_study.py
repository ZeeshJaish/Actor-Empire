"""Refine the established 3D character and compare controlled lighting rigs.

Input: the saved volume-study 03 Blender scene. Output: a complete independent
Blender scene and GLB, plus matched renders. The input scene is never saved over.
"""
import bpy
import bmesh
import math
import json
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(OUT))
from fix_sheen_export import fix_sheen_export
(OUT/'renders').mkdir(parents=True,exist_ok=True)
SOURCE=OUT.parent/'volume-study'/'actor-volume-study-03.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene
ROOT=bpy.data.objects['ActorEmpire_Volume_Study_03']
HEAD=bpy.data.objects['Head'];BODY=bpy.data.objects['Torso'];ARMS=bpy.data.objects['Arms_and_hands'];LEGS=bpy.data.objects['Trousers_and_shoes']
INKED=bpy.data.collections['Major silhouettes']
camera=scene.camera
scene.cycles.samples=64;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def color(h):return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
def mat(name,h,rough=.8,metallic=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color(h),1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metallic;p.inputs['Specular IOR Level'].default_value=.18
    return m

SKIN=bpy.data.materials['Terracotta skin'];SKIN_SHADE=bpy.data.materials['Skin soft plane']
JACKET=bpy.data.materials['Midnight navy bomber'];SEAM=bpy.data.materials['Navy stitching']
JACKET_LIGHT=bpy.data.materials['Bomber seam fabric'];DENIM=bpy.data.materials['Indigo denim']
STITCH=mat('Muted fabric thread','566174',.98)
ZIP=mat('Brushed zipper hardware','7A817E',.34,.65)
POCKET=mat('Pocket opening shadow','121B29',1)
EYE=mat('Dark eyes','10100F',.78)
EYE.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.06
FRECKLE=mat('Soft facial crease','9D684B',.94)

def mesh(name,vertices,faces,material,parent=ROOT,outline=False,smooth=False):
    d=bpy.data.meshes.new(name);d.from_pydata(vertices,[],faces);d.update()
    bm=bmesh.new();bm.from_mesh(d);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(d);bm.free()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=parent;d.materials.append(material)
    for p in d.polygons:p.use_smooth=smooth
    if outline:INKED.objects.link(o);o['outline']=True
    return o

def curve(name,points,radius,material,parent=ROOT):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=1;d.bevel_depth=radius;d.bevel_resolution=1
    s=d.splines.new('POLY');s.points.add(len(points)-1)
    for point,co in zip(s.points,points):point.co=(*co,1)
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.parent=parent;d.materials.append(material)
    return o

def bevel(o,width=.01,segments=2):
    m=o.modifiers.new('Tailored edge','BEVEL');m.width=width;m.segments=segments
    return o

def densify(o,cuts):
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=cuts,use_grid_fill=True)
    bm.to_mesh(o.data);bm.free();o.data.update()

def gaussian(v,c,w):return math.exp(-((v-c)/w)**2)

def surface_fn(obj):
    bpy.context.view_layer.update()
    bvh=BVHTree.FromObject(obj,bpy.context.evaluated_depsgraph_get())
    # These modeling meshes use the original world-aligned vertex coordinates.
    def surface(x,z,offset=0):
        p,n,_,_=bvh.ray_cast(Vector((x,-5,z)),Vector((0,1,0)),10)
        if p is None:raise ValueError(f'Missing surface on {obj.name}: {x}, {z}')
        return tuple(p+n*offset)
    return surface

# Rigs use the identical camera framing. A neutral reference render comes first.
RIGS={
    'studio':{'label':'Soft studio','floor':'DDD9D1','ambient':.32,'world':(.80,.86,1.0),
              'lights':[('Key',(-3.8,-5.5,7.6),850,4.2,(1,.92,.84)),('Fill',(4.2,-3.2,4.6),320,4.5,(.86,.93,1)),('Rim',(1.7,3.0,6),550,3.2,(1,.97,.91))]},
    'warm-cool':{'label':'Warm key / cool rim','floor':'26374C','ambient':.12,'world':(.45,.62,1.0),
                 'lights':[('Key',(-3.4,-4.5,6.2),930,2.7,(1,.72,.48)),('Fill',(3.4,-3.5,4),150,3.8,(.56,.73,1)),('Rim',(2.8,2.2,5.7),1100,2.4,(.40,.70,1))]},
    'daylight':{'label':'Directional daylight','floor':'D4C8B2','ambient':.23,'world':(.78,.88,1.0),
                'lights':[('Key',(-4.5,-3.8,7.5),1100,1.8,(1,.94,.84)),('Fill',(4.5,-4,3.8),180,5.0,(.73,.87,1)),('Rim',(2.5,2.8,5.4),300,3.0,(1,1,1))]}}

def set_rig(name):
    rig=RIGS[name]
    for o in list(bpy.data.objects):
        if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
    bg=scene.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(*rig['world'],1);bg.inputs['Strength'].default_value=rig['ambient']
    floor=bpy.data.materials['Ivory studio'];floor.diffuse_color=(*color(rig['floor']),1)
    floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=floor.diffuse_color
    for name,position,energy,size,tint in rig['lights']:
        light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.shape='DISK';light.size=size;light.color=tint
        o=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(o);o.location=position
        o.rotation_euler=(Vector((0,0,2.7))-o.location).to_track_quat('-Z','Y').to_euler()

def render(name,portrait=False):
    camera.location=(-4.4,-10,4.6) if portrait else (-6.3,-11.5,5.25)
    target=Vector((0,0,3.82) if portrait else (0,0,2.31))
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=2.3 if portrait else 5.5
    scene.render.resolution_x=1000;scene.render.resolution_y=1000 if portrait else 1250
    scene.render.filepath=str(OUT/'renders'/f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('DETAIL_RENDER',name,flush=True)

# Use light and material separation for this comparison. Freestyle's internal
# silhouettes turn small cloth folds into heavy cuts, obscuring the new form.
scene.render.use_freestyle=False

set_rig('studio')
render('before-studio');render('before-studio-portrait',True)

# Remove the previous tubing used as fold marks. Retain construction seams.
for o in list(bpy.data.objects):
    if any(s in o.name for s in ['elbow fold','forearm fold','knee fold','knuckle crease','thumb crease','Pocket welt','Pocket opening']):
        bpy.data.objects.remove(o,do_unlink=True)

# Sculpt broad fabric ridges and compression creases into the actual surfaces.
jacket=bpy.data.objects['Open padded bomber shell'];densify(jacket,3)
for v in jacket.data.vertices:
    x,y,z=v.co;front=max(0,min(1,(-y+.03)/.45))
    if front==0:continue
    a=abs(x)
    fold=(.027*gaussian(z,1.58+.16*a,.038)-.015*gaussian(z,1.63+.16*a,.024))*gaussian(a,.63,.33)
    fold+=(.028*gaussian(z,2.15-.40*a,.045)-.012*gaussian(z,2.19-.40*a,.028))*gaussian(a,.72,.25)
    fold+=.021*gaussian(z,2.52-.20*a,.045)*gaussian(a,.74,.19)
    v.co.y-=fold*front
jacket.data.update()

for label,s in [('Left',-1),('Right',1)]:
    sleeve=bpy.data.objects[label+' padded sleeve'];densify(sleeve,3)
    for v in sleeve.data.vertices:
        x,y,z=v.co;front=max(0,min(1,(-y+.03)/.22));a=abs(x)
        fold=.034*gaussian(z,2.12+.24*(a-1.2),.041)-.025*gaussian(z,2.17+.24*(a-1.2),.028)
        fold+=.032*gaussian(z,1.87-.40*(a-1.2),.038)-.014*gaussian(z,1.92-.40*(a-1.2),.025)
        fold+=.021*gaussian(z,1.67+.15*(a-1.2),.035)
        v.co.y-=fold*front
    sleeve.data.update()
    leg=bpy.data.objects[label+' shaped trouser leg'];densify(leg,3)
    for v in leg.data.vertices:
        x,y,z=v.co;front=max(0,min(1,(-y+.04)/.28));a=abs(x)
        fold=.028*gaussian(z,.67+.22*(a-.5),.035)-.022*gaussian(z,.72+.22*(a-.5),.024)
        fold+=.023*gaussian(z,.43-.30*(a-.5),.024)-.012*gaussian(z,.46-.30*(a-.5),.016)
        v.co.y-=fold*front
    leg.data.update()

# Pocket welts are strips fitted to the cloth, with a slit and stitched edges.
surface=surface_fn(jacket)
for s in [-1,1]:
    x0=s*.72;z0=1.70;x1=s*.58;z1=2.04
    verts=[]
    for j in range(9):
        t=j/8;x=x0+(x1-x0)*t;z=z0+(z1-z0)*t
        for dx in [-.042,-.012,.012,.042]:verts.append(surface(x+dx,z,.017 if abs(dx)>.02 else .007))
    faces=[]
    for j in range(8):
        for k in range(3):faces.append((j*4+k,j*4+k+1,(j+1)*4+k+1,(j+1)*4+k))
    pocket=mesh('Tailored welt pocket '+str(s),verts,faces,JACKET_LIGHT,BODY,smooth=True)
    pocket.data.materials.append(POCKET)
    for p in pocket.data.polygons:
        if p.index%3==1:p.material_index=1
    solid=pocket.modifiers.new('Welt thickness','SOLIDIFY');solid.thickness=.012
    for dx in [-.033,.033]:
        for j in range(9):
            t=(j+.16)/9;t2=(j+.60)/9
            points=[surface(x0+(x1-x0)*a+dx,z0+(z1-z0)*a,.023) for a in [t,t2]]
            curve('Pocket topstitch',points,.0028,STITCH,BODY)
    # Bar tacks secure both ends of each pocket.
    for t in [.025,.975]:
        x=x0+(x1-x0)*t;z=z0+(z1-z0)*t
        curve('Pocket bar tack',[surface(x-.034,z,.024),surface(x+.034,z,.024)],.004,STITCH,BODY)

    # Fine paired stitching on the front opening rather than heavy raised piping.
    for j in range(23):
        z=1.53+j*.047;x=s*(.24-.015*(z-1.53))
        try:curve('Jacket opening stitch',[surface(x,z,.016),surface(x,z+.019,.016)],.0024,STITCH,BODY)
        except ValueError:pass

# A zipper slider with an open pull loop gives the jacket a readable fastening.
z=1.70;x=-.226
slider_center=surface(x,z,.037)
bpy.ops.mesh.primitive_cube_add(size=1,location=slider_center)
slider=bpy.context.object;slider.name='Zipper slider';slider.dimensions=(.07,.048,.094);slider.parent=BODY
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);slider.data.materials.append(ZIP);bevel(slider,.009)
cx,cy,cz=slider_center
curve('Zipper pull loop',[(cx-.021,cy-.028,cz+.015),(cx-.025,cy-.050,cz-.086),(cx+.022,cy-.050,cz-.086),(cx+.021,cy-.028,cz+.015)],.008,ZIP,BODY)

# Join the palm and thumb into a single continuous hand surface.
for label,s in [('Left',-1),('Right',1)]:
    hand=bpy.data.objects[label+' closed hand'];thumb=bpy.data.objects[label+' folded thumb']
    bpy.ops.object.select_all(action='DESELECT');hand.select_set(True);thumb.select_set(True);bpy.context.view_layer.objects.active=hand
    bpy.ops.object.join();hand.name=label+' sculpted hand'
    remesh=hand.modifiers.new('Continuous thumb and palm','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.021;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth=hand.modifiers.new('Hand surface relaxation','SMOOTH');smooth.factor=.55;smooth.iterations=2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    for v in hand.data.vertices:
        x,y,z=v.co;front=max(0,min(1,(-y-.08)/.13))
        knuckles=sum(.012*gaussian(abs(x),c,.022)*gaussian(z,1.22,.06) for c in [1.14,1.205,1.27,1.335])
        v.co.y-=knuckles*front
    hand.data.update()
    hsurface=surface_fn(hand)
    for j in range(3):
        x=s*(1.17+.064*j)
        try:curve(label+' finger crease',[hsurface(x,1.12,.001),hsurface(x,1.165,.001)],.0034,SKIN_SHADE,ARMS)
        except ValueError:pass

# Gentle facial creases and lower lids keep the simple graphic eyes expressive.
skull=bpy.data.objects['Continuous rounded skull and jaw']
old_face=surface_fn(skull)
bpy.ops.object.select_all(action='DESELECT');skull.select_set(True);bpy.context.view_layer.objects.active=skull
subdivision=skull.modifiers.new('Refined skull curvature','SUBSURF');subdivision.levels=1;subdivision.render_levels=1
bpy.ops.object.modifier_apply(modifier=subdivision.name)
for v in skull.data.vertices:
    x,y,z=v.co
    if y<-.35 and abs(x)<.55:
        crease_z=4.225+.035*(1-(x/.55)**2)
        v.co.y+=.007*gaussian(z,crease_z,.012)*gaussian(x,0,.43)
skull.data.update()
face=surface_fn(skull)
for obj in list(HEAD.children):
    if obj.type=='MESH' and (obj.name.startswith('Stubble ') or obj.name in ['Asymmetric mouth','Lower lip plane','Left inset dark eye','Right inset dark eye','Left solid eyebrow','Right solid eyebrow']):
        for v in obj.data.vertices:
            try:v.co.y+=face(v.co.x,v.co.z)[1]-old_face(v.co.x,v.co.z)[1]
            except ValueError:pass
        obj.data.update()
for s in [-1,1]:
    x=s*.31
    points=[face(x-.062+j*.124/8,3.790-.008*math.sin(j*math.pi/8),.001) for j in range(9)]
    curve('Subtle lower eyelid '+str(s),points,.004,SKIN_SHADE,HEAD)
    for o in bpy.data.objects:
        if ('Left' if s<0 else 'Right')+' inset dark eye'==o.name:o.data.materials[0]=EYE

# Material contrast: matte skin and cotton, soft fabric sheen, worn leather,
# and restrained metal highlights. Keep the palette from the accepted base.
for m in [SKIN,bpy.data.materials['Skin warm plane'],SKIN_SHADE]:
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.88;p.inputs['Specular IOR Level'].default_value=.16
for m in [JACKET,JACKET_LIGHT,bpy.data.materials['Bomber ribbing']]:
    p=m.node_tree.nodes['Principled BSDF'];p.inputs['Roughness'].default_value=.88
    p.inputs['Sheen Weight'].default_value=.10;p.inputs['Sheen Roughness'].default_value=.72
    for n in m.node_tree.nodes:
        if n.type=='BUMP':n.inputs['Strength'].default_value=.16;n.inputs['Distance'].default_value=.016
for m in [bpy.data.materials['Warm grey cotton tee'],DENIM]:
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.98
bpy.data.materials['Brows and eyes'].node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=0
bpy.data.materials['Charcoal leather shoes'].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.52

ROOT.name='ActorEmpire_Detail_Light_Study_04'
set_rig('warm-cool')
camera.location=(-6.3,-11.5,5.25);camera.rotation_euler=(Vector((0,0,2.31))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=5.5
scene.render.resolution_x=1000;scene.render.resolution_y=1250
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'actor-detail-study-04.blend'))

bpy.ops.object.select_all(action='DESELECT')
def select_tree(o):
    o.select_set(True)
    for c in o.children:select_tree(c)
select_tree(ROOT);bpy.context.view_layer.objects.active=ROOT
bpy.ops.export_scene.gltf(filepath=str(OUT/'actor-detail-study-04.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
fix_sheen_export(OUT/'actor-detail-study-04.glb')

for rig in RIGS:
    set_rig(rig);render(rig);render(rig+'-portrait',True)

manifest={'source':str(SOURCE),'output':'actor-detail-study-04.blend','rigs':RIGS,'renders':['before-studio','before-studio-portrait']+[n for r in RIGS for n in [r,r+'-portrait']],'rigged':False,'matching_cameras':True,'details':['sculpted cloth folds','tailored pocket welts','topstitching','zipper pull','continuous hands','lower eyelids','material response']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('DETAIL_LIGHT_STUDY_COMPLETE',flush=True)
