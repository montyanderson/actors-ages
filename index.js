const got = require("got");
const db = require("redis").createClient();

const api_key = "47af9eaa74dc6edd71d7200f8a78a35a";

got("https://api.themoviedb.org/3/person/popular?api_key=" + api_key)
.then(res => {
	const people = JSON.parse(res.body).results;

	const requests = people.map(person => {
		return got("https://api.themoviedb.org/3/person/" + person.id + "?api_key=" + api_key);
	});

	return Promise.all(requests);
})
.then(requests => {
	const people = requests.map(request => JSON.parse(request.body));

	const multi = db.multi();

	people.forEach(p => {
		const birthday = new Date(p.birthday);
		const age = Math.floor((Date.now() - birthday) / (1000*60*60*24*365.25));

		console.log(p.id, age);

		multi.set("person:" + p.id, JSON.stringify(p));
		multi.zadd("people", age, p.id);
	});

	return new Promise((resolve, reject) => {
		multi.exec(err => {
			if(err) return reject();
			resolve();
		});
	});
})
.then(() => {
	console.log("Done!");
})
.catch(err => {
	console.log(err);
});
