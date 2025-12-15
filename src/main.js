import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let currentFont = 'Arial'
let currentTitle = ''

let bag = null
let bagMaterial = null

let canvas, ctx, textTexture
let textPlane = null



function setBagColor(hexColor) {
  if (!bagMaterial) return
  bagMaterial.color.set(hexColor)
}

function createTextTexture() {
  canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024

  ctx = canvas.getContext('2d')

  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  textTexture = new THREE.CanvasTexture(canvas)
  textTexture.needsUpdate = true

}

function drawTitle(text, font = 'Arial') {
  if (!ctx || !textTexture || !textPlane) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let fontSize = 180
  ctx.font = `bold ${fontSize}px "${font}"`

  const maxWidth = canvas.width * 0.8
  let textWidth = ctx.measureText(text).width

  while (textWidth > maxWidth && fontSize > 80) {
    fontSize -= 5
    ctx.font = `${fontSize}px "${font}"`
    textWidth = ctx.measureText(text).width
  }

  ctx.fillStyle = '#222'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillText(text, canvas.width / 2, canvas.height * 0.4)

  textTexture.needsUpdate = true
}

function createTextPlane() {
  const geometry = new THREE.PlaneGeometry(1.5, 1.5)

  const material = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false
  })

  textPlane = new THREE.Mesh(geometry, material)

  // 👉 RELATIEF t.o.v. de zak
  textPlane.position.set(0, 0.1, 0.35)
  textPlane.rotation.x = -0.04
  textPlane.rotation.y = Math.PI
  textPlane.renderOrder = 10

  bag.add(textPlane)
}


const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 1.5, 3)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)


scene.add(new THREE.AmbientLight(0xffffff, 0.8))

const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.position.set(5, 5, 5)
scene.add(dirLight)


const loader = new GLTFLoader()

loader.load(
  '/models/chipsbag.glb',
  (gltf) => {
    bag = gltf.scene

    bag.scale.set(1, 1, 1)
    bag.position.set(0, 2, 0)

    bag.traverse((child) => {
      if (child.isMesh && !bagMaterial) {
        bagMaterial = child.material
      }
    })

    createTextTexture()
    createTextPlane()
    drawTitle('Chips Bag')

    setBagColor('#ff0000')

    scene.add(bag)
  },
  undefined,
  (error) => console.error(error)
)

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()


window.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SET_COLOR') {
    setBagColor(event.data.color)
  }

  if (event.data.type === 'SET_TITLE') {
    currentTitle = event.data.title
    drawTitle(currentTitle, currentFont)
  }

  if (event.data.type === 'SET_FONT') {
    currentFont = event.data.font
    drawTitle(currentTitle, currentFont)
  }

  if (event.data.type === 'RESET') {
    // reset kleur
    setBagColor('#ff0000') // of je default kleur
  
    // reset tekst
    currentTitle = ''
    currentFont = 'Montserrat' // of default font
  
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    textTexture.needsUpdate = true
  }
})