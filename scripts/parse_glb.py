#!/usr/bin/env python3
"""Parse a GLB file and print its structure: nodes, meshes, materials, names."""
import struct
import json
import sys

def parse_glb(path):
    with open(path, 'rb') as f:
        data = f.read()

    magic = data[0:4]
    version = struct.unpack('<I', data[4:8])[0]
    length = struct.unpack('<I', data[8:12])[0]
    print(f"Magic: {magic}")
    print(f"Version: {version}")
    print(f"Length: {length}")
    print(f"File size: {len(data)} bytes")
    print()

    if magic != b'glTF':
        print("Not a valid GLB file!")
        return

    offset = 12
    chunk_idx = 0
    gltf_json = None
    bin_data = None

    while offset < len(data):
        chunk_length = struct.unpack('<I', data[offset:offset+4])[0]
        chunk_type = data[offset+4:offset+8]
        chunk_data = data[offset+8:offset+8+chunk_length]
        print(f"Chunk {chunk_idx}: type={chunk_type}, length={chunk_length}")
        if chunk_type == b'JSON':
            gltf_json = json.loads(chunk_data.decode('utf-8'))
        elif chunk_type == b'BIN\x00':
            bin_data = chunk_data
        offset += 8 + chunk_length
        chunk_idx += 1

    print()
    if gltf_json is None:
        print("No JSON chunk found")
        return

    print("=== ASSET ===")
    print(json.dumps(gltf_json.get('asset', {}), indent=2))
    print()

    scenes = gltf_json.get('scenes', [])
    print(f"=== SCENES ({len(scenes)}) ===")
    for i, scene in enumerate(scenes):
        print(f"Scene {i}: nodes={scene.get('nodes', [])}")
    print()

    nodes = gltf_json.get('nodes', [])
    print(f"=== NODES ({len(nodes)}) ===")
    for i, node in enumerate(nodes):
        name = node.get('name', '<unnamed>')
        mesh_idx = node.get('mesh', None)
        children = node.get('children', [])
        trans = []
        if 'translation' in node:
            trans.append(f"pos={node['translation']}")
        if 'rotation' in node:
            trans.append(f"rot={node['rotation']}")
        if 'scale' in node:
            trans.append(f"scale={node['scale']}")
        print(f"Node {i}: name='{name}', mesh={mesh_idx}, children={children}, {', '.join(trans)}")
    print()

    meshes = gltf_json.get('meshes', [])
    print(f"=== MESHES ({len(meshes)}) ===")
    for i, mesh in enumerate(meshes):
        name = mesh.get('name', '<unnamed>')
        prims = mesh.get('primitives', [])
        print(f"Mesh {i}: name='{name}', primitives={len(prims)}")
        for j, prim in enumerate(prims):
            attrs = prim.get('attributes', {})
            mat = prim.get('material', None)
            print(f"  Prim {j}: material={mat}, attrs={list(attrs.keys())}")
    print()

    materials = gltf_json.get('materials', [])
    print(f"=== MATERIALS ({len(materials)}) ===")
    for i, mat in enumerate(materials):
        name = mat.get('name', '<unnamed>')
        pbr = mat.get('pbrMetallicRoughness', {})
        base_color = pbr.get('baseColorFactor', None)
        metallic = pbr.get('metallicFactor', None)
        roughness = pbr.get('roughnessFactor', None)
        emissive = mat.get('emissiveFactor', None)
        print(f"Material {i}: name='{name}', baseColor={base_color}, metallic={metallic}, roughness={roughness}, emissive={emissive}")
    print()

    animations = gltf_json.get('animations', [])
    print(f"=== ANIMATIONS ({len(animations)}) ===")
    for i, anim in enumerate(animations):
        print(f"Animation {i}: name={anim.get('name','<unnamed>')}, channels={len(anim.get('channels',[]))}")
    print()

    print(f"=== SUMMARY ===")
    print(f"Nodes: {len(nodes)}, Meshes: {len(meshes)}, Materials: {len(materials)}")
    print(f"Animations: {len(animations)}")

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/scene.glb'
    parse_glb(path)
