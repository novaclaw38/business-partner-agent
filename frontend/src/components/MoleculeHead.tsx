import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type MoleculeHeadState = 'idle' | 'thinking' | 'speaking'

interface AtomSpec {
  x: number
  y: number
  z: number
  radius: number
  jaw: boolean
}

// Loosely head-shaped point cloud: a rounded cranium cluster plus a
// separate lower-front jaw cluster that can hinge independently.
const CRANIUM_ATOMS: AtomSpec[] = [
  { x: 0, y: 1.1, z: 0, radius: 0.34, jaw: false },
  { x: 0.55, y: 0.85, z: 0.4, radius: 0.26, jaw: false },
  { x: -0.55, y: 0.85, z: 0.4, radius: 0.26, jaw: false },
  { x: 0.55, y: 0.85, z: -0.4, radius: 0.26, jaw: false },
  { x: -0.55, y: 0.85, z: -0.4, radius: 0.26, jaw: false },
  { x: 0.9, y: 0.3, z: 0.5, radius: 0.22, jaw: false },
  { x: -0.9, y: 0.3, z: 0.5, radius: 0.22, jaw: false },
  { x: 0.9, y: 0.3, z: -0.5, radius: 0.22, jaw: false },
  { x: -0.9, y: 0.3, z: -0.5, radius: 0.22, jaw: false },
  { x: 0, y: 0.2, z: 0.9, radius: 0.3, jaw: false },
  { x: 0, y: 0.2, z: -0.9, radius: 0.3, jaw: false },
  { x: 0.4, y: -0.1, z: 0.7, radius: 0.2, jaw: false },
  { x: -0.4, y: -0.1, z: 0.7, radius: 0.2, jaw: false },
]

const JAW_ATOMS: AtomSpec[] = [
  { x: 0, y: -0.7, z: 0.55, radius: 0.24, jaw: true },
  { x: 0.35, y: -0.55, z: 0.4, radius: 0.18, jaw: true },
  { x: -0.35, y: -0.55, z: 0.4, radius: 0.18, jaw: true },
  { x: 0, y: -0.95, z: 0.2, radius: 0.16, jaw: true },
]

const ALL_ATOMS = [...CRANIUM_ATOMS, ...JAW_ATOMS]

// Bonds by atom index into ALL_ATOMS.
const BONDS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 5], [2, 6], [3, 7], [4, 8],
  [1, 9], [2, 9], [3, 10], [4, 10],
  [9, 11], [9, 12], [10, 11], [10, 12],
  [9, 13], [10, 13],
  [13, 14], [13, 15], [13, 16],
]

const JAW_HINGE_ORIGIN = new THREE.Vector3(0, -0.4, 0.3)

function buildBondMesh(a: THREE.Vector3, b: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a)
  const length = dir.length()
  const geometry = new THREE.CylinderGeometry(0.045, 0.045, length, 8)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(a).add(dir.clone().multiplyScalar(0.5))
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  return mesh
}

export function MoleculeHead({ state, analyser }: { state: MoleculeHeadState; analyser: AnalyserNode | null }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const size = 260
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x8888ff, 0.6))
    const key = new THREE.PointLight(0x7fd7ff, 1.4, 20)
    key.position.set(2, 2, 3)
    scene.add(key)

    const atomMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5cff, emissive: 0x3a1a80, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 })
    const jawMaterial = new THREE.MeshStandardMaterial({ color: 0x7fe0ff, emissive: 0x1a4a80, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 })
    const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2fbf, emissive: 0x1a0f40, emissiveIntensity: 0.4, roughness: 0.5 })

    const root = new THREE.Group()
    const craniumGroup = new THREE.Group()
    const jawGroup = new THREE.Group()
    root.add(craniumGroup)
    root.add(jawGroup)
    scene.add(root)

    const atomMeshes: THREE.Mesh[] = []
    ALL_ATOMS.forEach((atom) => {
      const geometry = new THREE.SphereGeometry(atom.radius, 16, 16)
      const mesh = new THREE.Mesh(geometry, atom.jaw ? jawMaterial : atomMaterial)
      mesh.position.set(atom.x, atom.y, atom.z)
      atomMeshes.push(mesh)
      ;(atom.jaw ? jawGroup : craniumGroup).add(mesh)
    })

    BONDS.forEach(([ai, bi]) => {
      const a = ALL_ATOMS[ai]
      const b = ALL_ATOMS[bi]
      const bondMesh = buildBondMesh(
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(b.x, b.y, b.z),
        bondMaterial,
      )
      const targetGroup = a.jaw || b.jaw ? jawGroup : craniumGroup
      targetGroup.add(bondMesh)
    })

    jawGroup.position.copy(JAW_HINGE_ORIGIN)
    JAW_ATOMS.forEach((atom, i) => {
      const mesh = jawGroup.children[i] as THREE.Mesh
      mesh.position.set(atom.x - JAW_HINGE_ORIGIN.x, atom.y - JAW_HINGE_ORIGIN.y, atom.z - JAW_HINGE_ORIGIN.z)
    })

    let frame: number
    let t = 0

    function render() {
      renderer.render(scene, camera)
    }

    function tick() {
      t += 0.01
      const currentState = stateRef.current
      const rotSpeed = currentState === 'thinking' ? 0.012 : currentState === 'speaking' ? 0.006 : 0.004
      root.rotation.y += rotSpeed

      render()
      if (!reduceMotion) frame = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(frame)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="molecule-head-wrap" ref={mountRef} aria-hidden="true" />
}
