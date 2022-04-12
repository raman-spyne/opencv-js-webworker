class CV {
    constructor() {
        this.resolves = {};
        this.rejects = {};
        this.id = 0;
    }
    
    dispatch(event) {
        let cvReqId = this.id++;

        return new Promise((res, rej) => {
            this.resolves[cvReqId] = res;
            this.rejects[cvReqId] = rej;
            this.worker.postMessage({cvReqId, ...event});
        })
    };

    load() {
        this.worker = new Worker(`${process.env.ASSET_PREFIX}/js/cv.worker.js`);
        this.worker.onmessage = (event) => {
            let {cvReqId, payload, error} = event.data;
            
            error ? 
                this.rejects[cvReqId](error) : 
                this.resolves[cvReqId](payload);
        }
        this.worker.onerror = (error) => console.log(error);
        return this.dispatch({msg: 'load'});
    }

    placeMaskImage(payload) {
        return this.dispatch({msg: 'placeMaskImage', payload});
    }

    placeLogoMaskImg(payload) {
        return this.dispatch({msg: 'placeLogoMaskImg', payload});
    }
}

export default new CV();