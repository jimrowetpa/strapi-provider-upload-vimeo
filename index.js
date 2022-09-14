import { Vimeo } from ("vimeo");

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
					client.upload(file.buffer,
						{
							name: file.hash,
							description: file.alternativeText,
						},
						() => {
							// complete
							console.log("complete");
							console.dir(this);
							// file.url = res.data.link;
							resolve();
						},
						(bytesUploaded, bytesTotal) => {
							// progress
							var percentage = (bytesUploaded / bytesTotal * 100).toFixed(2)
							console.log(bytesUploaded, bytesTotal, percentage + "%")
						},
						(err) => {
							// error
							console.log(err);
							reject();
					});
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
