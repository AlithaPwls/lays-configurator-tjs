import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let bag = null
let bagMaterial = null

let canvas, ctx, textTexture, textPlane
let currentTitle = ''
let currentFont = 'Arial'

/* SCENE */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

/* CAMERA */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 1.2, 4)

/* RENDERER */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

/* ORBIT CONTROLS */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.enablePan = false
controls.rotateSpeed = 0.6
controls.zoomSpeed = 0.8
controls.minDistance = 2
controls.maxDistance = 6
controls.minPolarAngle = Math.PI / 3
controls.maxPolarAngle = Math.PI / 2

/* LIGHTS */
scene.add(new THREE.AmbientLight(0xffffff, 0.8))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 5, 5)
scene.add(dirLight)

/* BAG COLOR */
function setBagColor(hex) {
  if (bagMaterial) {
    bagMaterial.color.set(hex)
  }
}

/* TEXT TEXTURE */
function createTextTexture() {
  canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024

  ctx = canvas.getContext('2d')

  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  textTexture = new THREE.CanvasTexture(canvas)
}

/* DRAW TITLE */
function drawTitle() {
  if (!ctx || !textTexture || !textPlane) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let fontSize = 180
  ctx.font = `bold ${fontSize}px "${currentFont}"`
  const maxWidth = canvas.width * 0.8
  let textWidth = ctx.measureText(currentTitle).width

  while (textWidth > maxWidth && fontSize > 80) {
    fontSize -= 5
    ctx.font = `bold ${fontSize}px "${currentFont}"`
    textWidth = ctx.measureText(currentTitle).width
  }

  ctx.fillStyle = '#222'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(currentTitle, canvas.width / 2, canvas.height * 0.42)

  textTexture.needsUpdate = true
}

/* TEXT PLANE */
function createTextPlane() {
  const geometry = new THREE.PlaneGeometry(1.5, 1.5)
  const material = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false
  })

  textPlane = new THREE.Mesh(geometry, material)
  textPlane.position.set(0, 0.1, 0.35)
  textPlane.rotation.x = -0.04
  textPlane.rotation.y = Math.PI
  textPlane.renderOrder = 10

  bag.add(textPlane)
}

/* LOAD MODEL */
const loader = new GLTFLoader()
loader.load('/models/chipsbag.glb', (gltf) => {
  bag = gltf.scene

  bag.scale.set(1.2, 1.2, 1.2)
  bag.position.set(0, 0, 0)

  bag.traverse((child) => {
    if (child.isMesh && !bagMaterial) {
      bagMaterial = child.material
    }
  })

  createTextTexture()
  createTextPlane()
  drawTitle()

  scene.add(bag)

  /* 🔥 BELANGRIJK: ROTEREN ROND EIGEN AS */
  controls.target.copy(bag.position)
  controls.update()
})

/* ANIMATE */
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}
animate()

/* POSTMESSAGE COMMUNICATIE */
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