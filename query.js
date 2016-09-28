const Redis = require("ioredis");
const db = new Redis();

function getByAge(min, max) {
	return db.zrangebyscore("people", min, max || min)
		.then(ids => ids.map(id => db.get("person:" + id)))
		.then(ids => Promise.all(ids));
}

getByAge(30, 45).then(people => {
	console.log(people);
}).catch(err => console.log(err));
