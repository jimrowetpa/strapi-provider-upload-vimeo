const Vimeo = require("./utils/upload.js");

module.exports = {
	init(config) {
		var client = new Vimeo(
			config.clientId,
			config.clientSecret,
			config.accessToken
		);

		return {
			upload(file) {
				return new Promise((resolve, reject) => {
					client
						.uploadFromBinary({
							video: file.buffer,
							name: file.hash,
							description: file.alternativeText,
						})
						.then((res) => {
							if (config.premium) {
								client
									.getFromId(res.data.uri)
									.then((res) => {
										for (i = 0; i < res.data.files.length; i++) {
											if (res.data.files[i].rendition == "360p") {
												file.url = res.data.files[i].link;
												break;
											}
										}

										if (file.url == undefined) {
											file.url = res.data.link;
										}

										file.provider_metadata = {
											link: res.data.link,
											files: res.data.files,
										};
										resolve();
									})
									.catch((err) => {
										console.log("get", err);
										reject();
									});
							} else {
								file.url = res.data.link;
								resolve();
							}
						})
						.catch((err) => {
							console.log(err);
							reject();
						});
				});
			},
			delete(file) {
				if (file && file.provider_metadata && file.provider_metadata.link) {
					str = file.provider_metadata.link;
					client.vimeoClient.request(
						{
							method: "DELETE",
							path: "/videos/" + str.split("/")[str.split("/").length - 1],
						},
						function (error, body, status_code, headers) {
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
