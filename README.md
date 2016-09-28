# actors-ages
Querying actors by age with redis.

## Intro

### Packages used in this example

* [got](https://www.npmjs.com/package/got), a http request library
* [redis](https://www.npmjs.com/package/redis), a redis client library

### Setup

``` javascript
const got = require("got");
const db = require("redis").createClient();

const api_key = "47af9eaa74dc6edd71d7200f8a78a35a";
```

## Querying actors from TMDB

* [TMDB People API Documentation](https://developers.themoviedb.org/3/people/)

``` javascript
got("https://api.themoviedb.org/3/person/popular?api_key=" + api_key)
.then(res => {
	const people = JSON.parse(res.body);

	console.log(people);
});
```

```
$ node index.js
{ page: 1,
  results:
   [ { profile_path: '/8EueDe6rPF0jQU4LSpsH2Rmrqac.jpg',
       adult: false,
       id: 1245,
       known_for: [Object],
       name: 'Scarlett Johansson',
       popularity: 38.164065 },
     { profile_path: '/tDPS8QHdOmdmu400haPcYum8BHC.jpg',
       adult: false,
       id: 21911,
       known_for: [Object],
       name: 'Shu Qi',
       popularity: 36.402095 },
     { profile_path: '/lGwyyXppO9EAB6NvebdWwlLx7ds.jpg',
       adult: false,
       id: 234352,
       known_for: [Object],
       name: 'Margot Robbie',
       popularity: 35.146857 },
     { profile_path: '/nkrIGojQy6FNn9s5cfpiUAmLeNz.jpg',
       adult: false,
       id: 28782,
       known_for: [Object],
       name: 'Monica Bellucci',
       popularity: 32.648064 },
     { profile_path: '/kRlx7PxXkom7Daj8Z2HmcbPQB1o.jpg',
       adult: false,
       id: 16828,
       known_for: [Object],
       name: 'Chris Evans',
       popularity: 24.543298 },
```

So, we now have a list of 'popular' people at the moment, but seemingly no age or gender information.

Thus, we'll have to get a profile for each of the popular people;

``` javascript
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

	console.log(people);
});
```

* **Note:** I'm using [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) and [arrow functions](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/Arrow_functions) here, so read up on them if the **.then()** or **() => {}** looks weird to you.

```
$ node index.js
[ { adult: false,
    also_known_as: [ 'Scarlett Johanssen', '스칼렛 요한슨' ],
    biography: 'Scarlett Johansson, born November 22, 1984, is an American actress, model and singer. She made her film debut in North (1994) and was later nominated for the Independent Spirit Award for Best Female Lead for her performance in Manny &amp; Lo (1996), garnering further acclaim and prominence with roles in The Horse Whisperer (1998) and Ghost World (2001). She shifted to adult roles with her performances in Girl with a Pearl Earring (2003) and Sofia Coppola\'s Lost in Translation (2003), for which she won a BAFTA award for Best Actress in a Leading Role; both films earned her Golden Globe Award nominations as well.\n\nA role in A Love Song for Bobby Long (2004) earned Johansson her third Golden Globe for Best Actress nomination. Johansson garnered another Golden Globe nomination for Best Supporting Actress with her role in Woody Allen\'s Match Point (2005). She has played the Marvel comic book character Black Widow/Natasha Romanoff in Iron Man 2 (2010), The Avengers (2012), and Captain America: The Winter Soldier (2014) and is set to reprise the role in Avengers: Age of Ultron (2015). The 2010 Broadway revival of Arthur Miller\'s A View From the Bridge won Johansson the Tony Award for Best Performance by a Featured Actress in a Play. As a singer, Johansson has released two albums, Anywhere I Lay My Head and Break Up.\n\nJohansson is considered one of Hollywood\'s modern sex symbols, and has frequently appeared in published lists of the sexiest women in the world, most notably when she was named the "Sexiest Woman Alive" by Esquire magazine in both 2006 and 2013 (the only woman to be chosen for the title twice), and the "Sexiest Celebrity" by Playboy magazine in 2007.\n\nJohansson was born in New York City. Her father, Karsten Johansson, is a Danish-born architect, and her paternal grandfather, Ejner Johansson, was a screenwriter and director. Her mother, Melanie Sloan, a producer, comes from an Ashkenazi Jewish family from the Bronx. Johansson has an older sister, Vanessa, who is an actress; an older brother, Adrian; a twin brother, Hunter (who appeared in the film Manny &amp; Lo with Scarlett); and a half-brother, Christian, from her father\'s re-marriage.',
    birthday: '1984-11-22',
    deathday: '',
    gender: 1,
    homepage: '',
    id: 1245,
    imdb_id: 'nm0424060',
    name: 'Scarlett Johansson',
    place_of_birth: 'New York City, New York, USA',
    popularity: 37.164065,
    profile_path: '/8EueDe6rPF0jQU4LSpsH2Rmrqac.jpg' },
```

We now have a profile for each of the popular people!

## Storing actors in redis

``` javascript
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
		p.age = Math.floor((Date.now() - birthday) / (1000*60*60*24*365.25));

		console.log(p.id, p.age);

		multi.set("person:" + p.id, JSON.stringify(p));
		multi.zadd("people", p.age, p.id);
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
```

## Querying actors by age

``` javascript
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
	console.log(people);
}).catch(err => console.log(err));
```

This will return all the actors between the specified ages!

```
$ node query.js
[ { adult: false,
    also_known_as: [ 'Alex Daddario', 'Alexandra Daddorio ' ],
    biography: 'Alexandra Anna Daddario (born March 16, 1986) is an American actress, known to film audiences as Annabeth Chase in the 2010 film Percy Jackson &amp; the Olympians: The Lightning Thief. Daddario was also in The Squid and the Whale, All My Children, The Babysitters, The Attic, The Hottest State, White Collar, It\'s Always Sunny in Philadelphia, and Bereavement. She will star as the protagonist "Heather Miller" in the 2013 horror film Texas Chainsaw 3D.',
    birthday: '1986-03-16',
    deathday: '',
    gender: 1,
    homepage: '',
    id: 109513,
    imdb_id: 'nm1275259',
    name: 'Alexandra Daddario',
    place_of_birth: 'New York City, New York, USA',
    popularity: 19.173467,
    profile_path: '/idDAi1sjaHDIlDc78D8G9HaJ8le.jpg',
    age: 30 },

```

### Filtering by gender

``` javascript
getByAge(30, 45).then(people => {
	const women = people.filter(p => p.gender == 1);
	const men = people.filter(p => p.gender == 2);

	console.log(women, men);
}).catch(err => console.log(err));
```

Because

``` javascript
const women = people.filter(p => p.gender == 1);
```

is the same as

``` javascript
const women = people.filter(function(person) {
	return person.gender == 1;
});
```

## Keeping code modular by making an actor class

Coming soon!
