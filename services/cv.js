class CV {
 
  _dispatch(event) {
    const { msg } = event
    this._status[msg] = ['loading']
    this.worker.postMessage(event)
    return new Promise((res, rej) => {
      let interval = setInterval(() => {
        const status = this._status[msg]
        if(status[0] === 'done') res(status[1])
        if(status[0] === 'error') rej(status[1])
        if(status[0] !== 'loading') { 
          delete this._status[msg]
          clearInterval(interval)
        }
      }, 50)
    }) 
  }

  load() {
    this._status = {}
    this.worker = new Worker(`${process.env.ASSET_PREFIX}/js/cv.worker.js`) // load worker

    // Capture events and save [status, event] inside the _status object
    this.worker.onmessage = e => this._status[e.data.msg] = ['done', e]
    this.worker.onerror = e => this._status[e.message] = ['error', e]
    return this._dispatch({ msg: 'load' })
  }

 
  imageProcessing(payload) {
    return this._dispatch({ msg: 'imageProcessing', payload })
  }

  placeMaskImage(payload) {
    return this._dispatch({msg: 'placeMaskImage', payload});
  }
}

// Export the same instant everywhere
export default new CV()