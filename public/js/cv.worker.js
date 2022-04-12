/**
 * With OpenCV we have to work the images as cv.Mat (matrices),
 * so the first thing we have to do is to transform the
 * ImageData to a type that openCV can recognize.
 */
function imageProcessing({ msg, payload }) {
  const img = cv.matFromImageData(payload)
  let result = new cv.Mat()

  // What this does is convert the image to a grey scale.
  cv.cvtColor(img, result, cv.COLOR_BGR2GRAY)
  postMessage({ msg, payload: imageDataFromMat(result) })
}

function placeMaskImage(origImg, maskImg, cvReqId) {

  origImg = cv.matFromImageData(origImg);
  maskImg = cv.matFromImageData(maskImg);

  let grayMask = new cv.Mat();
  cv.cvtColor(maskImg, grayMask, cv.COLOR_RGB2GRAY);

  let thresImg = new cv.Mat();
  cv.threshold(grayMask, thresImg, 120, 255, cv.THRESH_BINARY);

  let bitNTImg = new cv.Mat();
  cv.bitwise_not(thresImg, bitNTImg);

  let bg = new cv.Mat();
  cv.bitwise_or(origImg, origImg, bg, bitNTImg);

  let fg = new cv.Mat();
  cv.bitwise_and(maskImg, maskImg, fg, grayMask);

  let res = new cv.Mat();
  cv.add(bg, fg, res);

  postMessage({ msg: 'placeMaskImage', payload: imageDataFromMat(res), cvReqId });
}

function placeNumPlateLogo(origImg, maskImg, logo) {
  origImg = cv.matFromImageData(origImg);
  maskImg = cv.matFromImageData(maskImg);
  logo = cv.matFromImageData(logo);

  let grayMask = new cv.Mat();
  cv.cvtColor(maskImg, grayMask, cv.COLOR_RGB2GRAY);

  let thresImg = new cv.Mat();
  cv.threshold(grayMask, thresImg, 120, 255, cv.THRESH_BINARY);

  let bitNTImg = new cv.Mat();
  cv.bitwise_not(thresImg, bitNTImg);

  let bg = new cv.Mat();
  cv.bitwise_or(origImg, origImg, bg, bitNTImg);

  // //////////////// for mask + logo /////////////////////// //

  let grayMaskResize = new cv.Mat();
  cv.resize(grayMask, grayMaskResize, new cv.Size(0, 0), fx = 2, fy = 2);

  let grayMaskThres = new cv.Mat();
  let tempVect = new cv.MatVector();
  cv.threshold(grayMaskResize, grayMaskThres, 40, 255, 0);
  // cv.split(grayMaskThres, tempVect);
  // grayMaskThres = tempVect.get(1);

  let contours = new cv.MatVector();
  let hiearchy = new cv.Mat();
  cv.findContours(grayMaskThres, contours, hiearchy, 1, 2);
  contours = contours.get(0);

  let rect = cv.minAreaRect(contours);
  let angle = rect.angle;

  // let box = new cv.Mat();
  // cv.boxPoints(rect, box);

  let box = cv.RotatedRect.boundingRect({
    center: rect.center,
    size: rect.size,
    angle: rect.angle
  })

  let box2 = cv.RotatedRect.points({
    center: rect.center,
    size: rect.size,
    angle: rect.angle
  })


  let area = rect.size.height * rect.size.width;

  if (area) {

    let w = logo.cols, h = logo.rows;

    if (angle > 45) {
      var pts1 = [0, 0];
      var pts2 = [w, 0];
      var pts3 = [w, h];
      var pts4 = [0, h];
    } else {
      var pts1 = [0, h];
      var pts2 = [0, 0];
      var pts3 = [w, 0];
      var pts4 = [w, h];
    }

    let ptSrc = [pts1, pts2, pts3, pts4];

    ptSrc = cv.matFromArray(ptSrc[0].length,ptSrc.length, cv.CV_32F, ptSrc);
    console.log(Object.values(ptSrc));
    let tranformMat = cv.findHomography(ptSrc, box).homography;
    let result = new cv.Mat();
    cv.warpPerspective(logo, result, tranformMat, grayMaskResize.size(), borderMode = cv.BORDER_CONSTANT, new cv.Scalar());

    let grayMaskResize1 = new cv.Mat();
    cv.resize(result, grayMaskResize1, new cv.Size(0, 0), fx = 0.5, fy = 0.5, interpolation = cv.INTER_LANCZOS4);

    ////////////////////////////////////////////////////////////
    let fg = new cv.Mat();
    cv.bitwise_and(maskImg, grayMaskResize1, fg, grayMask);

    let res = new cv.Mat();
    cv.add(bg, fg, res);

    postMessage({ msg: 'placeMaskImage', payload: imageDataFromMat(res), cvReqId });
  }
}


/**
 * This function is to convert again from cv.Mat to ImageData
 */
function imageDataFromMat(mat) {
  // convert the mat type to cv.CV_8U
  const img = new cv.Mat()
  const depth = mat.type() % 8
  const scale =
    depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0
  const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0
  mat.convertTo(img, cv.CV_8U, scale, shift)

  // convert the img type to cv.CV_8UC4
  switch (img.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(img, img, cv.COLOR_GRAY2RGBA)
      break
    case cv.CV_8UC3:
      cv.cvtColor(img, img, cv.COLOR_RGB2RGBA)
      break
    case cv.CV_8UC4:
      break
    default:
      throw new Error(
        'Bad number of channels (Source image must have 1, 3 or 4 channels)'
      )
  }
  const clampedArray = new ImageData(
    new Uint8ClampedArray(img.data),
    img.cols,
    img.rows
  )
  img.delete()
  return clampedArray
}

/**
 *  Here we will check from time to time if we can access the OpenCV
 *  functions. We will return in a callback if it has been resolved
 *  well (true) or if there has been a timeout (false).
 */
function waitForOpencv(callbackFn, waitTimeMs = 30000, stepTimeMs = 100) {
  if (cv.Mat) callbackFn(true)

  let timeSpentMs = 0
  const interval = setInterval(() => {
    const limitReached = timeSpentMs > waitTimeMs
    if (cv.Mat || limitReached) {
      clearInterval(interval)
      return callbackFn(!limitReached)
    } else {
      timeSpentMs += stepTimeMs
    }
  }, stepTimeMs)
}



/**
 * This exists to capture all the events that are thrown out of the worker
 * into the worker. Without this, there would be no communication possible
 * with our project.
 */
onmessage = function (e) {
  try {
    switch (e.data.msg) {
      case 'load': {
        // Import Webassembly script
        self.importScripts('https://docs.opencv.org/master/opencv.js');
        waitForOpencv(function (success) {
          if (success) postMessage({ msg: e.data.msg, cvReqId: e.data.cvReqId });
          else throw new Error('Error on loading OpenCV');
        })
        break
      }
      case 'imageProcessing':
        return imageProcessing(e.data)
      case 'placeMaskImage':
        return placeMaskImage(e.data.payload.carImg, e.data.payload.maskImg, e.data.cvReqId);
      case 'placeLogoMaskImg':
        return placeNumPlateLogo(e.data.payload.carImg, e.data.payload.maskImg, e.data.payload.logoImg, e.data.cvReqId);
      default:
        break
    }
  }
  catch (error) {
    postMessage({ cvReqId: e.data.cvReqId, error });
  }
}
