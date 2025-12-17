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
   CONTROLS
===================== */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 2
controls.maxDistance = 4
controls.target.set(0, 1.2, 0)
controls.update()

/* =====================
   LIGHTS
===================== */
scene.add(new THREE.AmbientLight(0xffffff, 1.5))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(4, 6, 4)
scene.add(dirLight)

/* =====================
   REFERENCES
===================== */
let bagMesh = null
let bagMaterial = null

let labelTop = null
let labelBottom = null

let currentFont = 'Arial'
let currentTitle = ''
let currentFlavor = ''

/* =====================
   CANVAS HELPERS
===================== */
function createTextCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')


  // 🔥 spiegel canvas horizontaal
 //ctx.translate(width, 0)
  //ctx.scale(-1, 1)

  return { canvas, ctx }
}


function drawText(ctx, canvas, text, startFontSize) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.font = `bold ${startFontSize}px "${currentFont}"`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let fontSize = startFontSize
  const maxWidth = canvas.width * 0.9
  let textWidth = ctx.measureText(text).width

  while (textWidth > maxWidth && fontSize > 60) {
    fontSize -= 4
    ctx.font = `bold ${fontSize}px "${currentFont}"`
    textWidth = ctx.measureText(text).width
  }

  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
}

/* =====================
   TEXTURES
===================== */
const titleData = createTextCanvas(1024, 256)
const titleTexture = new THREE.CanvasTexture(titleData.canvas)
titleTexture.flipY = false

const flavorData = createTextCanvas(1024, 256)
const flavorTexture = new THREE.CanvasTexture(flavorData.canvas)
flavorTexture.flipY = false

/* =====================
   BAG COLOR
===================== */
function setBagColor(hex) {
  if (bagMaterial) {
    bagMaterial.color.set(hex)
  }
}

/* =====================
   LOAD MODEL
===================== */
const loader = new GLTFLoader()

loader.load('/models/chipsbag2.glb', (gltf) => {
  const bag = gltf.scene
  bag.position.set(0, 1.5, 0)
  bag.scale.set(0.7, 0.7, 0.7)

  bag.traverse((child) => {
    if (!child.isMesh) return

    child.castShadow = true
    child.receiveShadow = true

    if (child.name === 'Bag_Main') {
      bagMesh = child
      bagMaterial = child.material
    }

    if (child.name === 'Label_Top') {
      labelTop = child
    }

    if (child.name === 'Label_Bottom') {
      labelBottom = child
    }
  })

  /* APPLY TEXTURES TO LABELS */
  if (labelTop) {
    labelTop.material = labelTop.material.clone()
    labelTop.material.map = titleTexture
    labelTop.material.transparent = true
    labelTop.material.needsUpdate = true
  }

  if (labelBottom) {
    labelBottom.material = labelBottom.material.clone()
    labelBottom.material.map = flavorTexture
    labelBottom.material.transparent = true
    labelBottom.material.needsUpdate = true
  }

  scene.add(bag)
})

/* =====================
   ANIMATION LOOP
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
    drawText(titleData.ctx, titleData.canvas, currentTitle, 400)
    titleTexture.needsUpdate = true
  }

  if (event.data.type === 'SET_FLAVOR') {
    currentFlavor = event.data.flavor
    drawText(flavorData.ctx, flavorData.canvas, currentFlavor, 100)
    flavorTexture.needsUpdate = true
  }

  if (event.data.type === 'SET_FONT') {
    currentFont = event.data.font

    // redraw both
    drawText(titleData.ctx, titleData.canvas, currentTitle, 400)
    drawText(flavorData.ctx, flavorData.canvas, currentFlavor, 100)
    titleTexture.needsUpdate = true
    flavorTexture.needsUpdate = true
  }

  if (event.data.type === 'RESET') {
    currentTitle = ''
    currentFlavor = ''
    titleData.ctx.clearRect(0, 0, titleData.canvas.width, titleData.canvas.height)
    flavorData.ctx.clearRect(0, 0, flavorData.canvas.width, flavorData.canvas.height)
    titleTexture.needsUpdate = true
    flavorTexture.needsUpdate = true
  }

  if (event.data.type === 'GET_SCREENSHOT') {
    const image = renderer.domElement.toDataURL('image/png')
    window.parent.postMessage(
      { type: 'SCREENSHOT_RESULT', image },
      '*'
    )
  }
})