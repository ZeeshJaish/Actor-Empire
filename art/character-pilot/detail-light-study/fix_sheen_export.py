"""Match Blender's 0.10 white sheen weight in this study's glTF materials.

The inspected Blender 5.1.1 exporter emits white sheenColorFactor=1 while
discarding the separate Principled Sheen Weight. glTF has no separate weight;
its color factor must contain that scaling. Geometry and binary data are kept.
"""
import json
import struct
import sys
from pathlib import Path

NAMES={'Bomber seam fabric','Midnight navy bomber','Bomber ribbing'}

def fix_sheen_export(path):
    path=Path(path);raw=path.read_bytes()
    magic,version,total=struct.unpack_from('<III',raw)
    if (magic,version,total)!=(0x46546C67,2,len(raw)):raise ValueError('Invalid GLB header')
    size,kind=struct.unpack_from('<II',raw,12)
    if kind!=0x4E4F534A:raise ValueError('Expected JSON first chunk')
    document=json.loads(raw[20:20+size]);changed=[]
    for material in document.get('materials',[]):
        if material.get('name') in NAMES:
            sheen=material.get('extensions',{}).get('KHR_materials_sheen')
            if sheen is None:raise ValueError('Missing expected fabric sheen extension')
            sheen['sheenColorFactor']=[.10,.10,.10]
            changed.append(material['name'])
    if set(changed)!=NAMES:raise ValueError('Expected all three fabric materials')
    data=json.dumps(document,separators=(',',':')).encode()
    data+=b' '*((-len(data))%4)
    remaining=raw[20+size:]
    result=struct.pack('<III',magic,version,20+len(data)+len(remaining))+struct.pack('<II',len(data),kind)+data+remaining
    path.write_bytes(result)
    return changed

if __name__=='__main__':
    print(json.dumps({'corrected_materials':fix_sheen_export(sys.argv[1]),'sheen_factor':.10}))
