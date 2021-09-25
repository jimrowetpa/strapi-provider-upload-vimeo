var vimeoClient = require('vimeo').Vimeo;
const axios = require('axios');
const { UploadVideoTusJs } = require('./tus');

class vimeo {

    constructor(clientId, clientSecret, accessToken){
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = accessToken;
        this.vimeoClient = new vimeoClient(this.clientId, this.clientSecret, this.accessToken);
    }

    uploadFromLink(params = {
        link: 'http://link/video.mp4',
        name: 'video name',
        description: 'video desc',
        folder: ''
    }) {
        return new Promise((resolve, reject) => {
            
            var link = params.link,
                name = params.name,
                description = params.description,
                folder = params.folder;

            axios.post('https://api.vimeo.com/me/videos', {
                "upload": {
                    "approach": "pull",
                    "link": link ? link : undefined,
                    "size": undefined
                },
                "name": name ? name : undefined,
                "description": description ? description : undefined
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }).then(res => {
                
                var vimeoVideoID = res.data.uri.split('/')[2];
                resolve(res)
                if(folder){
                    axios.put(`https://api.vimeo.com/me/projects/${folder}/videos/${vimeoVideoID}`,{}, {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`
                        }})
                        .then(response => {

                            resolve(response);

                        }).catch(err => {
                            reject(err);
                        });
                }else{
                    resolve(res);
                }

            }).catch(err => {
                reject(err);
            });
        });
    }

    uploadFromBinary(params = {
        video: Buffer.alloc(8),
        name: 'video name',
        description: 'video desc',
        folder: ''
    }){
        return new Promise((resolve, reject) => {

            var video = params.video,
                name = params.name,
                description = params.description,
                folder = params.folder;

            axios.post('https://api.vimeo.com/me/videos', {
                "upload": {
                    "approach": "tus",
                    "size": video.byteLength
                },
                "name": name ? name : undefined,
                "description": description ? description : undefined
            }, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }).then(res => {
                
                var vimeoVideoID = res.data.uri.split('/')[2];
                
                resolve(res)
                UploadVideoTusJs(res.data.upload.upload_link, video)
                .then(res => {

                    if(folder){
                        axios.put(`https://api.vimeo.com/me/projects/${folder}/videos/${vimeoVideoID}`,{}, {
                            headers: {
                                Authorization: `Bearer ${this.accessToken}`
                            }})
                            .then(response => {
                                resolve(response);
    
                            }).catch(err => {
                                reject(err);
                            });
                    }else{
                        resolve(res);
                    }

                }).catch(err => {
                    reject(err);
                });

            }).catch(err => {
                reject(err);
            });

        });
    }

}

module.exports = vimeo;