const Vimeo = require("vimeo").Vimeo;

module.exports = {
	init(config) {
		var client = new Vimeo(
			config.clientId,
			config.clientSecret,
			config.accessToken
		);

		return {
			upload(file) {
				console.log("TEST FILE->");
				console.dir(file);

				return new Promise((resolve, reject) => {
					client.request({
						method: "POST",
						path: "/me/videos",
						name: file.hash,
						folder_uri: config.folderId,
						description: file.alternativeText,
						upload: {
							approach: 'tus',
							size: file.length
						}
					},
					function(error, body, status_code, headers) {
							// complete
							console.log("error:"+error);
							console.log("status_code:"+status_code);

							// console.dir(body);
							// console.dir(headers);
							// file.url = res.data.link;

							// now send the actual data
							client.request({
								method: "PATCH",
								headers: {
									"Tus-Resumable": "1.0.0",
									"Upload-Offset": "0",
									"Content-Type": "application/offset+octet-stream"
								},
								path: body.upload.upload_link,
							},
							function(error, body, status_code, headers) {

							});

							// check progress

							resolve();
					});

					// ,
					// 	(bytesUploaded, bytesTotal) => {
					// 		// progress
					// 		var percentage = (bytesUploaded / bytesTotal * 100).toFixed(2)
					// 		console.log(bytesUploaded, bytesTotal, percentage + "%")
					// 	},
					// 	(err) => {
					// 		// error
					// 		console.log(err);
					// 		reject();
					// });
				});
			},
			delete(file) {
				if (file && file.provider_metadata && file.provider_metadata.link) {
					str = file.provider_metadata.link;
					client.request(
						{
							method: "DELETE",
							path: "/videos/" + str.split("/")[str.split("/").length - 1],
						},
						function(error, body, status_code, headers) {
							if (error) {
								console.log(error);
							}
						}
					);
				}
			},
		};
	},
};
