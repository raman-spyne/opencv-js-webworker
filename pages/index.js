import { useEffect, useRef, useState } from 'react'
// import cv from '../services/cv';
import cv from '../services/cv2';

// We'll limit the processing size to 200px.
const maxVideoSize = 500

export default function Page() {
  const [processing, setProcessing] = useState(false)
  const canvasEl = useRef(null)
  const canvasE2 = useRef(null);

  /**
   * What we will do in the onClick event is capture a frame within
   * the video to pass this image on our service.
   */
  async function onClick() {
    setProcessing(true)

    const ctx = canvasEl.current.getContext('2d');
    const ctx2 = canvasE2.current.getContext('2d');

    let img = document.querySelector('#test_img');
    let img2 = document.querySelector('#mask_img');
    let logo = document.querySelector('#logo_img');

    img.getImageData

    ctx.drawImage(img, 0, 0, maxVideoSize*1.5, maxVideoSize);
    const carImg = ctx.getImageData(0, 0, maxVideoSize*1.5, maxVideoSize);

    ctx2.drawImage(img2, 0, 0, maxVideoSize*1.5, maxVideoSize);
    const maskImg = ctx2.getImageData(0, 0, maxVideoSize*1.5, maxVideoSize);
    ctx2.drawImage(logo, 0, 0, maxVideoSize*1.5, maxVideoSize);
    const logoImg = ctx2.getImageData(0,0, maxVideoSize*1.5, maxVideoSize);
    // Load the model
    
    // Processing image
    const processedImage = await cv.placeLogoMaskImg({carImg, maskImg, logoImg});
    // Render the processed image to the canvas
  
    ctx.putImageData(processedImage, 0, 0)
    setProcessing(false)
  }
  
  useEffect(() => {
    cv.load();
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <img id='test_img' src='./test_car3.jpg' alt='test' width={maxVideoSize*1.5} height={maxVideoSize} />
      <img id='mask_img' src='./mask2.png' alt='test' width={maxVideoSize*1.5} height={maxVideoSize} hidden/>
      <img id='logo_img' src='./logo.png' alt='logo' width={maxVideoSize*1.5} height={maxVideoSize} hidden />
      <button 
        disabled={processing} 
        style={{ width: maxVideoSize, padding: 10 }} 
        onClick={onClick}
      >
        {processing ? 'Processing...' : 'Click'}
      </button>
      <canvas
        ref={canvasEl}
        width={maxVideoSize*1.5}
        height={maxVideoSize}
      ></canvas>
      <canvas 
        ref={canvasE2} 
        width={maxVideoSize * 1.5}
        height={maxVideoSize} 
        hidden>
      </canvas>
    </div>
  )
}
