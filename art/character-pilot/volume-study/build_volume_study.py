"""Actor Empire: one fully volumetric character, checked from several cameras.

Blender 5.1.1. New geometry throughout; no reuse of the extruded v2 head.
"""
import bpy
import bmesh
import math
import random
import json
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
(OUT/'renders').mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
INKED=bpy.data.collections.new('Major silhouettes')
bpy.context.scene.collection.children.link(INKED)

def srgb(h):
    def channel(x):
        v=int(x,16)/255
        return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    return tuple(channel(h[i:i+2]) for i in (0,2,4))

def material(name,color,roughness=.82,grain=False):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*srgb(color),1)
    m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=m.diffuse_color
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Specular IOR Level'].default_value=.22
    if grain:
        noise=m.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value=155
        noise.inputs['Detail'].default_value=2
        bump=m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value=.11
        bump.inputs['Distance'].default_value=.013
        m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    return m

SKIN=material('Terracotta skin','B9784E')
SKIN_SHADE=material('Skin soft plane','AF6E49')
SKIN_LIGHT=material('Skin warm plane','C08055')
EAR_INNER=material('Inner ear','915237')
BEARD=material('Shaved jaw','766658')
BEARD_SIDE=material('Shaved jaw side','6B5D51')
STUBBLE=material('Short stubble','443B33')
BLACK=material('Brows and eyes','100E10')
LIP=material('Lip ochre','88533D')
JACKET=material('Midnight navy bomber','293347',grain=True)
JACKET_LIGHT=material('Bomber seam fabric','333E52',grain=True)
JACKET_SHADOW=material('Bomber ribbing','1E2635',grain=True)
SEAM=material('Navy stitching','151D2A')
TEE=material('Warm grey cotton tee','B4AD9B',grain=True)
TEE_EDGE=material('Cotton collar','9C9585')
DENIM=material('Indigo denim','294969',grain=True)
DENIM_SEAM=material('Denim seam','213851')
LEATHER=material('Charcoal leather shoes','202326',.65)
SOLE=material('Rubber sole','111418')
METAL=material('Dark silver zipper','777B7D',.5)
FLOOR=material('Ivory studio','E9E6DF',1)

def empty(name,parent=None):
    o=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(o)
    o.parent=parent
    return o

ROOT=empty('ActorEmpire_Volume_Study_03')
HEAD=empty('Head',ROOT)
BODY=empty('Torso',ROOT)
LEGS=empty('Trousers_and_shoes',ROOT)
ARMS=empty('Arms_and_hands',ROOT)

def mesh(name,verts,faces,mat,parent=ROOT,smooth=False,outline=True):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.parent=parent;data.materials.append(mat)
    if outline:
        INKED.objects.link(obj);obj['outline']=True
    for p in data.polygons:p.use_smooth=smooth
    return obj

def bevel(obj,width=.025,segments=2):
    mod=obj.modifiers.new('Soft constructed edges','BEVEL')
    mod.width=width;mod.segments=segments
    mod.affect='EDGES'
    mod.profile=.5
    return obj

def curve(name,points,radius,mat,parent=ROOT):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D'
    data.resolution_u=1;data.bevel_depth=radius;data.bevel_resolution=1
    s=data.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    o.data.materials.append(mat);o.parent=parent
    return o

def signed_power(v,e):return math.copysign(abs(v)**e,v)

def loft(name,rings,mat,parent=ROOT,sides=24,power=1,smooth=True,gap=0,outline=True):
    # Rings are center x/y, height, horizontal radius, front/back radius.
    steps=sides+1 if gap else sides
    angles=[gap+(math.tau-2*gap)*i/sides for i in range(steps)] if gap else [math.tau*i/sides for i in range(sides)]
    vs=[]
    for x,y,z,w,d in rings:
        vs.extend((x+w*signed_power(math.sin(a),power),y-d*signed_power(math.cos(a),power),z) for a in angles)
    fs=[]
    for j in range(len(rings)-1):
        for i in range(steps-1 if gap else steps):
            k=(i+1)%steps
            fs.append((j*steps+i,j*steps+k,(j+1)*steps+k,(j+1)*steps+i))
    if not gap:
        fs.extend([tuple(range(steps-1,-1,-1)),tuple(range((len(rings)-1)*steps,len(rings)*steps))])
    o=mesh(name,vs,fs,mat,parent,smooth,outline)
    if gap:
        solid=o.modifiers.new('Actual fabric thickness','SOLIDIFY');solid.thickness=.035
    return o

def tube(name,points,radii,mat,parent=ROOT,sides=16,smooth=True,outline=True,depth=.9):
    vs=[]
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        a=tangent.cross(Vector((0,-1,0))).normalized()
        b=tangent.cross(a).normalized()
        for k in range(sides):
            angle=math.tau*k/sides
            vs.append(tuple(Vector(p)+a*math.cos(angle)*radii[i]+b*math.sin(angle)*radii[i]*depth))
    fs=[tuple(range(sides-1,-1,-1))]
    for j in range(len(points)-1):
        for i in range(sides):fs.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    fs.append(tuple(range((len(points)-1)*sides,len(points)*sides)))
    return mesh(name,vs,fs,mat,parent,smooth,outline)

def ellipsoid(name,center,scale,mat,parent=ROOT,segments=20,rings=12,smooth=True,outline=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=center)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);o.parent=parent
    for p in o.data.polygons:p.use_smooth=smooth
    if outline:INKED.objects.link(o);o['outline']=True
    return o

def box(name,center,scale,mat,parent=ROOT,rounding=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat);o.parent=parent
    bevel(o,rounding,2);INKED.objects.link(o);o['outline']=True
    return o

# A continuous three-dimensional skull: rounded crown, temples, cheeks and jaw.
# Profile depth is comparable to width, rather than an extruded face silhouette.
PROFILE=[
    (3.015,.43,.37,.025),(3.07,.56,.44,.015),(3.17,.665,.51,.015),
    (3.31,.71,.555,.025),(3.46,.735,.59,.025),(3.60,.69,.595,.03),
    (3.74,.68,.60,.025),(3.88,.705,.62,.025),(4.03,.72,.63,.03),
    (4.18,.72,.63,.035),(4.32,.69,.60,.045),(4.43,.605,.545,.05),
    (4.50,.47,.43,.055),(4.545,.28,.285,.065),(4.565,.055,.075,.065)]

def shape(z):
    if z<=PROFILE[0][0]:return PROFILE[0][1:]
    if z>=PROFILE[-1][0]:return PROFILE[-1][1:]
    for a,b in zip(PROFILE,PROFILE[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0])
            return tuple(a[k]*(1-t)+b[k]*t for k in range(1,4))

def gauss(x,c,w):return math.exp(-((x-c)/w)**2)

def front_detail(x,z):
    cheek=-.055*gauss(abs(x),.45,.17)*gauss(z,3.65,.16)
    chin=-.045*gauss(x,0,.48)*gauss(z,3.22,.16)
    socket=.04*gauss(abs(x),.32,.14)*gauss(z,3.87,.10)
    ridge=-.025*gauss(abs(x),.33,.24)*gauss(z,4.025,.11)
    return cheek+chin+socket+ridge

EXP=.77
N=2/EXP
def front_y(x,z):
    w,d,cy=shape(z)
    surface=cy-d*max(0,1-(min(abs(x)/w,.9999))**N)**(1/N)
    return surface+front_detail(x,z)

levels=[]
for a,b in zip(PROFILE,PROFILE[1:]):
    levels.extend([a[0],(a[0]+b[0])/2])
levels.append(PROFILE[-1][0])
vs=[];SIDES=48
for z in levels:
    w,d,cy=shape(z)
    for i in range(SIDES):
        angle=math.tau*i/SIDES
        x=w*signed_power(math.sin(angle),EXP)
        y=cy-d*signed_power(math.cos(angle),EXP)
        if math.cos(angle)>0:y+=front_detail(x,z)*math.cos(angle)**.3
        vs.append((x,y,z))
fs=[tuple(range(SIDES-1,-1,-1))]
for j in range(len(levels)-1):
    for i in range(SIDES):fs.append((j*SIDES+i,j*SIDES+(i+1)%SIDES,(j+1)*SIDES+(i+1)%SIDES,(j+1)*SIDES+i))
fs.append(tuple(range((len(levels)-1)*SIDES,len(levels)*SIDES)))
skull=mesh('Continuous rounded skull and jaw',vs,fs,SKIN,HEAD,True)
for m in [SKIN_SHADE,SKIN_LIGHT,BEARD,BEARD_SIDE]:skull.data.materials.append(m)
for p in skull.data.polygons:
    c=p.center
    beard_line=3.585-.055*gauss(c.x,0,.20)
    if c.z<beard_line and c.y<.18:
        p.material_index=4 if abs(c.x)>.60 else 3

loft('Neck',[(0,.035,2.88,.30,.29),(0,.035,3.11,.32,.30),(0,.055,3.25,.34,.31)],SKIN,BODY,sides=24)

# Surface-following features hug the skull and remain attached at other angles.
def face_patch(name,poly,mat,offset=.012,thickness=.006,outline=False):
    verts=[(x,front_y(x,z)-offset,z) for x,z in poly]
    verts.extend((x,front_y(x,z)-offset+thickness,z) for x,z in poly)
    n=len(poly)
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh(name,verts,faces,mat,HEAD,False,outline)

for s,label in [(-1,'Left'),(1,'Right')]:
    x=s*.31
    eye=face_patch(label+' inset dark eye',[(x-.068,3.795),(x+.068,3.795),(x+.068,3.945),(x-.068,3.945)],BLACK,.009,.035)
    bevel(eye,.010,2)
    # Brows have curved backs and real thickness, with subtle asymmetry.
    coords=[]
    xa,xb=(-.57,-.105) if s<0 else (.115,.565)
    for k in range(7):
        t=k/6;x=xa+(xb-xa)*t
        z=4.12-.075*t if s<0 else 4.07+.02*t
        coords.append((x,z))
    coords.extend((x,z-.16) for x,z in reversed(coords.copy()))
    brow=face_patch(label+' solid eyebrow',coords,BLACK,.045,.065)
    bevel(brow,.012,2)
    ear=ellipsoid(label+' ear',(s*.765,.02,3.805),(.175,.17,.265),SKIN,HEAD,16,10)
    inner=ellipsoid(label+' ear concha',(s*.81,-.126,3.815),(.075,.04,.158),EAR_INNER,HEAD,16,8,outline=False)
    points=[]
    for k in range(18):
        a=-.85+4.95*k/17
        points.append((s*(.812+.094*math.sin(a)),-.143-.014*math.cos(a),3.83+.183*math.cos(a)))
    curve(label+' ear helix',points,.022,SKIN_LIGHT,HEAD)
    ellipsoid(label+' ear tragus',(s*.745,-.154,3.765),(.042,.043,.071),SKIN,HEAD,12,8,outline=False)

# A projecting wedge with a bridge, sidewalls, tip and nostril wings.
nose=loft('Sculpted nose bridge and tip',[
    (0,-.625,3.58,.085,.072),
    (0,-.715,3.62,.125,.145),
    (0,-.738,3.68,.132,.167),
    (0,-.688,3.78,.104,.132),
    (0,-.632,3.93,.074,.077),
    (0,-.602,4.055,.064,.040)],SKIN,HEAD,sides=12,power=.75,smooth=False,outline=False)
bevel(nose,.016,2)
for s in [-1,1]:
    ellipsoid('Nostril wing '+str(s),(s*.107,-.724,3.62),(.065,.085,.050),SKIN,HEAD,12,8,outline=False)
    ellipsoid('Nostril shadow '+str(s),(s*.088,-.792,3.603),(.028,.026,.014),EAR_INNER,HEAD,12,8,outline=False)

face_patch('Asymmetric mouth',[(-.20,3.415),(-.115,3.44),(.19,3.425),(.195,3.385),(-.11,3.397),(-.205,3.377)],BLACK,.016,.009)
face_patch('Lower lip plane',[(-.115,3.379),(.17,3.37),(.115,3.340),(-.08,3.349)],LIP,.012,.006)
random.seed(52)
for i in range(31):
    x=random.uniform(-.65,.65);z=random.uniform(3.09,3.565)
    if abs(x)<.25 and 3.30<z<3.48:continue
    if abs(x)>shape(z)[0]-.055:continue
    w=random.uniform(.015,.025);h=random.uniform(.021,.032)
    face_patch('Stubble %02d'%i,[(x-w/2,z),(x+w/2,z+.003),(x+w/2,z+h),(x-w/2,z+h-.002)],STUBBLE,.006,.004)
HEAD.scale.x=.93

# A padded jacket shell has depth, an open front, shaped shoulders and a cotton core.
TORSO=[(0,.03,1.37,.83,.38),(0,.03,1.46,.92,.43),(0,.03,1.68,.97,.48),
       (0,.03,2.03,1.015,.52),(0,.03,2.40,1.01,.535),(0,.045,2.68,.935,.49),
       (0,.055,2.88,.77,.405),(0,.045,3.00,.48,.31),(0,.045,3.03,.335,.265)]
shirt=loft('Full cotton torso',[(x,y,z,w-.034,d-.024) for x,y,z,w,d in TORSO],TEE,BODY,sides=32,power=.85,smooth=True)
jacket=loft('Open padded bomber shell',TORSO,JACKET,BODY,sides=48,power=.8,smooth=True,gap=.155)

def torso_shape(z):
    for a,b in zip(TORSO,TORSO[1:]):
        if a[2]<=z<=b[2]:
            t=(z-a[2])/(b[2]-a[2]);return tuple(a[k]*(1-t)+b[k]*t for k in (0,1,3,4))
    a=TORSO[0] if z<TORSO[0][2] else TORSO[-1]
    return a[0],a[1],a[3],a[4]
def cloth_y(x,z):
    _,cy,w,d=torso_shape(z)
    return cy-d*max(.005,1-(min(abs(x)/w,.999))**2.5)**.4

# Ribbed round-neck collar and a raised jacket collar wrap all the way around.
collar=loft('Cotton round collar',[(0,.032,2.965,.335,.285),(0,.032,3.01,.332,.282)],TEE_EDGE,BODY,sides=32,power=1,smooth=True,outline=False)
loft('Raised bomber collar',[(0,.07,2.92,.53,.36),(0,.07,3.035,.46,.33),(0,.07,3.08,.39,.30)],JACKET_SHADOW,BODY,sides=32,power=.9,smooth=True,gap=.63)
for s in [-1,1]:
    collar_points=[(s*.145,-.43,2.86),(s*.30,-.27,3.105),(s*.565,-.29,2.94),(s*.40,-.52,2.725),(s*.305,-.545,2.845)]
    collar_points.extend((x,y+.065,z+.008) for x,y,z in collar_points.copy())
    collar_faces=[(4,3,2,1,0),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
    bevel(mesh('Folded bomber collar '+str(s),collar_points,collar_faces,JACKET_LIGHT,BODY),.016,2)
    # The zipper and topstitching follow the jacket opening, including chest curvature.
    points=[]
    for j in range(30):
        z=1.4+1.55*j/29
        _,cy,w,d=torso_shape(z);x=s*w*math.sin(.155)**.8
        points.append((x,cloth_y(x,z)-.028,z))
    curve('Zip edge '+str(s),points,.015,SEAM,BODY)
    for j in range(24):
        z=1.47+.052*j;_,cy,w,d=torso_shape(z);x=s*w*math.sin(.155)**.8
        curve('Zip tooth',[(x-.014,cloth_y(x,z)-.039,z),(x+.014,cloth_y(x,z)-.039,z)],.005,METAL,BODY)
    # Welts have a raised fabric border and a recessed dark slit.
    pocket=[]
    for j in range(8):
        t=j/7;x=s*(.72-.14*t);z=1.70+.34*t
        pocket.append((x,cloth_y(x,z)-.037,z))
    curve('Pocket welt '+str(s),pocket,.035,JACKET_LIGHT,BODY)
    curve('Pocket opening '+str(s),[(x,y-.025,z) for x,y,z in pocket],.012,SEAM,BODY)
    chest=[]
    for j in range(8):
        x=s*(.43+.31*j/7);z=2.58
        chest.append((x,cloth_y(x,z)-.022,z))
    curve('Chest panel seam '+str(s),chest,.009,SEAM,BODY)
    side=[]
    for j in range(14):
        z=1.54+j*.08;x=s*(.79+.12*math.sin((z-1.54)*2))
        side.append((x,cloth_y(x,z)-.017,z))
    curve('Jacket princess seam '+str(s),side,.009,JACKET_SHADOW,BODY)

hem=loft('Bomber knitted hem',[(0,.03,1.32,.835,.40),(0,.03,1.37,.885,.435),(0,.03,1.52,.915,.455)],JACKET_SHADOW,BODY,sides=48,power=.8,gap=.16)
for k in range(68):
    a=.19+(math.tau-.38)*k/67
    points=[]
    for j in range(4):
        z=1.34+j*.05;w=.85+(z-1.34)*.4;d=.413+(z-1.34)*.24
        points.append((w*signed_power(math.sin(a),.8),.03-(d+.007)*signed_power(math.cos(a),.8),z))
    curve('Hem knit rib',points,.007,JACKET_LIGHT,BODY)

# Rounded sleeves taper through an elbow, a narrow knitted cuff and modeled hands.
for s,label in [(-1,'Left'),(1,'Right')]:
    points=[(s*.56,.095,2.67),(s*.78,.065,2.75),(s*1.005,.035,2.655),(s*1.125,.008,2.46),
            (s*1.20,-.02,2.25),(s*1.235,-.04,1.95),(s*1.22,-.075,1.64),(s*1.205,-.08,1.48)]
    tube(label+' padded sleeve',points,[.22,.305,.335,.315,.295,.275,.245,.228],JACKET,ARMS,sides=20)
    tube(label+' ribbed cuff',[(s*1.205,-.08,1.47),(s*1.206,-.079,1.57),(s*1.21,-.074,1.63)],[.216,.23,.233],JACKET_SHADOW,ARMS,24)
    for k in range(18):
        a=math.tau*k/18
        curve(label+' cuff rib',[(s*1.205+math.sin(a)*.223,-.08-math.cos(a)*.203,1.48),(s*1.21+math.sin(a)*.235,-.074-math.cos(a)*.214,1.62)],.007,JACKET_LIGHT,ARMS)
    curve(label+' sleeve seam',[(s*1.35,-.185,2.62),(s*1.445,-.19,2.22),(s*1.435,-.195,1.86),(s*1.375,-.22,1.65)],.009,JACKET_SHADOW,ARMS)
    curve(label+' elbow fold',[(s*1.005,-.233,2.02),(s*1.18,-.302,2.105),(s*1.28,-.284,2.085)],.014,JACKET_SHADOW,ARMS)
    curve(label+' forearm fold',[(s*1.15,-.294,1.77),(s*1.29,-.277,1.74),(s*1.36,-.23,1.79)],.01,JACKET_LIGHT,ARMS)
    hand=loft(label+' closed hand',[(s*1.21,-.065,1.075,.15,.135),(s*1.21,-.085,1.115,.20,.155),(s*1.215,-.075,1.30,.205,.17),(s*1.21,-.065,1.45,.175,.145),(s*1.205,-.065,1.52,.157,.14)],SKIN,ARMS,sides=20,power=.62,smooth=True)
    thumb=ellipsoid(label+' folded thumb',(s*1.075,-.225,1.27),(.085,.093,.151),SKIN,ARMS,16,10)
    thumb.rotation_euler.y=s*.17
    curve(label+' thumb crease',[(s*1.09,-.30,1.20),(s*1.13,-.294,1.23),(s*1.135,-.283,1.33)],.009,SKIN_SHADE,ARMS)
    for k in range(3):
        x=s*(1.19+.057*k)
        curve(label+' knuckle crease',[(x,-.236,1.12),(x,-.247,1.18)],.005,SKIN_SHADE,ARMS)

# Jeans have a connected hip volume, fuller thighs and cloth folds at the knees.
loft('Denim hips',[(0,.07,1.10,.79,.38),(0,.07,1.34,.84,.39),(0,.07,1.48,.83,.38)],DENIM,LEGS,sides=32,power=.8)
for s,label in [(-1,'Left'),(1,'Right')]:
    leg=loft(label+' shaped trouser leg',[(s*.495,.055,.31,.307,.29),(s*.50,.04,.41,.324,.315),(s*.51,.045,.65,.327,.315),(s*.48,.07,.83,.352,.34),(s*.44,.07,1.02,.376,.37),(s*.42,.07,1.29,.398,.39),(s*.42,.07,1.43,.39,.38)],DENIM,LEGS,sides=24,power=.72)
    curve(label+' outer jean seam',[(s*.80,.015,.35),(s*.835,.015,.66),(s*.832,.02,.97),(s*.81,.035,1.28)],.01,DENIM_SEAM,LEGS)
    curve(label+' knee fold',[(s*.24,-.225,.61),(s*.44,-.296,.635),(s*.66,-.267,.60)],.012,DENIM_SEAM,LEGS)
    curve(label+' trouser hem',[(s*.22,-.235,.36),(s*.46,-.280,.345),(s*.73,-.23,.36)],.011,DENIM_SEAM,LEGS)
    loft(label+' shoe sole',[(s*.50,-.11,.04,.36,.49),(s*.50,-.11,.105,.37,.50),(s*.50,-.105,.155,.365,.50)],SOLE,LEGS,sides=24,power=.6,smooth=False)
    loft(label+' leather shoe',[(s*.50,-.10,.14,.36,.49),(s*.50,-.11,.23,.355,.485),(s*.50,-.08,.30,.335,.455),(s*.50,.055,.385,.295,.30),(s*.50,.06,.415,.286,.28)],LEATHER,LEGS,sides=24,power=.7,smooth=True)
    curve(label+' shoe toe seam',[(s*.25,-.438,.275),(s*.48,-.475,.29),(s*.72,-.43,.273)],.009,SOLE,LEGS)

# Genuine 3D light and contact shadows, with contours limited to major forms.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU'
scene.cycles.samples=64;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1350;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.world=bpy.data.worlds.new('Soft studio ambient');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.78,.83,.92,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.015))
floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(FLOOR)
def area(name,location,power,size,color,target):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=location
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm key',(-3.8,-5.5,8.0),740,3.6,(1,.89,.76),(0,0,2.6))
area('Soft cool fill',(4.8,-2.6,4.7),220,4.0,(.76,.86,1),(0,0,2.6))
area('Shoulder rim',(1.2,3.2,6.3),450,3.4,(1,.96,.85),(0,0,2.6))

bpy.ops.object.camera_add(location=(-6.3,-11.5,6.0))
camera=bpy.context.object;camera.name='Volume inspection camera';camera.data.type='ORTHO';camera.data.ortho_scale=5.55
def aim(location,target,scale):
    camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
aim((-6.3,-11.5,6.0),(0,0,2.33),5.55);scene.camera=camera
scene.render.use_freestyle=True
fs=bpy.context.view_layer.freestyle_settings
line_set=fs.linesets[0];line_set.select_by_collection=True;line_set.collection=INKED;line_set.collection_negation='INCLUSIVE'
line_set.select_silhouette=True;line_set.select_border=False;line_set.select_crease=False
line_set.select_material_boundary=False;line_set.select_edge_mark=False;line_set.select_external_contour=True
if line_set.linestyle is None:line_set.linestyle=bpy.data.linestyles.new('Clean external contours')
line_set.linestyle.color=(.008,.007,.009);line_set.linestyle.thickness=3.2;line_set.linestyle.caps='ROUND'

bpy.context.view_layer.update()
source=OUT/'actor-volume-study-03.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source))

# A real GLB is exported with only the character, excluding stage and lighting.
bpy.ops.object.select_all(action='DESELECT')
def select_tree(obj):
    obj.select_set(True)
    for child in obj.children:select_tree(child)
select_tree(ROOT)
bpy.context.view_layer.objects.active=ROOT
bpy.ops.export_scene.gltf(filepath=str(OUT/'actor-volume-study-03.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False)

for name,location,target,scale in [
    ('three-quarter',(-6.3,-11.5,5.25),(0,0,2.31),5.5),
    ('front',(0,-13,4.1),(0,0,2.31),5.42),
    ('side',(-13,-.6,4.1),(0,0,2.31),5.42),
    ('portrait',(-4.4,-10,4.6),(0,0,3.82),2.30),
]:
    aim(location,target,scale)
    scene.render.resolution_x=1000 if name=='portrait' else 1100
    scene.render.resolution_y=1000 if name=='portrait' else 1350
    scene.render.filepath=str(OUT/'renders'/f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('VOLUME_RENDER',name,flush=True)

bpy.context.view_layer.update()
head_bounds=[skull.matrix_world@Vector(v.co) for v in skull.data.vertices]
width=max(v.x for v in head_bounds)-min(v.x for v in head_bounds)
depth=max(v.y for v in head_bounds)-min(v.y for v in head_bounds)
height=max(v.z for v in head_bounds)-min(v.z for v in head_bounds)
evidence={'blender_version':bpy.app.version_string,'head_dimensions':{'width':width,'depth':depth,'height':height},'head_depth_to_width':depth/width,'head_vertices':len(skull.data.vertices),'head_faces':len(skull.data.polygons),'views':['front','three-quarter','side','portrait'],'rigged':False,'reference':'Owner supplied five-character lineup, 2026-09-06'}
(OUT/'verification.json').write_text(json.dumps(evidence,indent=2)+'\n')
print('VOLUME_STUDY_COMPLETE',json.dumps(evidence),flush=True)
