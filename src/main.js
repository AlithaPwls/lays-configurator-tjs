import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* =====================
   SCENE
===================== */

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

/* =====================
   CAMERA
===================== */

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(0, 1.4, 3)

/* =====================
   RENDERER
===================== */

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

/* =====================
   ORBIT CONTROLS
===================== */

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.minDistance = 2
controls.maxDistance = 4
controls.target.set(0, 1.2, 0)
controls.update()

/* =====================
   LICHT
===================== */

scene.add(new THREE.AmbientLight(0xffffff, 0.9))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(4, 6, 4)
scene.add(dirLight)

/* =====================
   VARIABELEN
===================== */

let bag = null
let bagMaterial = null
let labelMesh = null

let canvas, ctx, textTexture
let currentTitle = ''
let currentFont = 'Arial'

/* =====================
   ZAK KLEUR
===================== */

function setBagColor(hex) {
  if (bagMaterial) {
    bagMaterial.color.set(hex)
  }
}

/* =====================
   CANVAS TEXTURE
===================== */

function createTextTexture() {
  canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512

  ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  textTexture = new THREE.CanvasTexture(canvas)
  textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()
}

/* =====================
   TEKST TEKENEN
===================== */

function drawTitle() {
  if (!ctx || !textTexture) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let fontSize = 160
  ctx.font = `bold ${fontSize}px "${currentFont}"`
  ctx.fillStyle = '#111'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = canvas.width * 0.85
  let textWidth = ctx.measureText(currentTitle).width

  while (textWidth > maxWidth && fontSize > 80) {
    fontSize -= 5
    ctx.font = `bold ${fontSize}px "${currentFont}"`
    textWidth = ctx.measureText(currentTitle).width
  }

  ctx.fillText(currentTitle, canvas.width / 2, canvas.height / 2)
  textTexture.needsUpdate = true
}

/* =====================
   MODEL LADEN
===================== */

const loader = new GLTFLoader()

loader.load('/models/chipsbag.glb', (gltf) => {
  bag = gltf.scene
  bag.position.set(0, 1.5, 0)
  bag.scale.set(0.7, 0.7, 0.7)

  bag.traverse((child) => {
    if (!child.isMesh) return

    child.castShadow = true
    child.receiveShadow = true

    // Hoofdmateriaal van de zak
    if (!bagMaterial) {
      bagMaterial = child.material
    }

    // 🎯 LABEL ZONE (grijze vlakken in het model)
    if (
      child.material &&
      child.material.color &&
      child.material.color.r > 0.7 &&
      child.material.color.g > 0.7 &&
      child.material.color.b > 0.7
    ) {
      labelMesh = child
    }
  })

  createTextTexture()
  drawTitle()

  if (labelMesh) {
    labelMesh.material = labelMesh.material.clone()
    labelMesh.material.map = textTexture
    labelMesh.material.transparent = true
    labelMesh.material.needsUpdate = true
  }

  scene.add(bag)
})

/* =====================
   ANIMATIE
===================== */

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

/* =====================
   POSTMESSAGE (VUE)
===================== */

window.addEventListener('message', (event) => {
  if (!event.data?.type) return

  if (event.data.type === 'SET_COLOR') {
    setBagColor(event.data.color)
  }

  if (event.data.type === 'SET_TITLE') {
    currentTitle = event.data.title
    drawTitle()
  }

  if (event.data.type === 'SET_FONT') {
    currentFont = event.data.font
    drawTitle()
  }

  if (event.data.type === 'RESET') {
    currentTitle = ''
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    textTexture.needsUpdate = true
  }

  if (event.data.type === 'GET_SCREENSHOT') {
    const image = renderer.domElement.toDataURL('image/png')
    window.parent.postMessage(
      { type: 'SCREENSHOT_RESULT', image },
      '*'
    )
  }
})