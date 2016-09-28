const db = require("redis").createClient();

function getByAge(min, max) {
	return new Promise((resolve, reject) => {
		db.zrangebyscore("people", min, max || min, (err, ids) => {
			if(err) return reject(err);

			const query = db.multi();

			ids.forEach(id => query.get("person:" + id));

			query.exec((err, people) => {
				if(err) return reject();
				resolve(people.map(JSON.parse));
			});
		});
	});
}

getByAge(30, 45).then(people => {
	const women = people.filter(p => p.gender == 1);
	const men = people.filter(p => p.gender == 2);

	console.log(women, men);
}).catch(err => console.log(err));
