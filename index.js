if (process.env.NODE_ENV != 'production')
  require('dotenv').config();

const express = require('express')
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 2022
const app = express();

const { MongoClient } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '458072387181-1fjuvmtvl2vqoci1hdrelq464np2qmd4.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const mongoClient = new MongoClient(process.env.DATABASE_URL);

async function createConnection() {
  try {
    await mongoClient.connect();
  } catch (e) {
    console.log(e);
  }
}

createConnection();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(express.static('files'));

app.get('/', (req, res) => {
  res.redirect('login');
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/warn', (req, res) => {
  res.render('warn')
})

app.post('/login', (req, res) => {
  let token = req.body.token;

  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
  }

  verify()
    .then(() => {
      res.cookie('session-token', token);
      res.send('success');
    })
    .catch(console.error);
})

app.get('/logout', (req, res) => {
  res.clearCookie('session-token');
  res.redirect('login');
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
  let user = req.user;

  async function getMessages() {
    console.log(await mongoClient.db("odo_valentine").collection("odo_valentine")
      .findOne({ email: user.email }));
  }

  getMessages();

  res.render('dashboard', { user });
})

app.post('/dashboard', (req, res) => {
  let clasa = req.body.clasa;
  let nume = req.body.nume;
  let mesaj = req.body.mesaj;

  async function update() {
    let item = await check(mongoClient);
    if (item == null) {
      res.send('error');
    } else {
      /*await mongoClient.db("odo_valentine").collection("odo_valentine")
        .update({}, { $set: { "messages": [] } });*/

      /*await mongoClient.db("odo_valentine").collection("odo_valentine")
        .updateOne({ name: nume, "class": clasa }, { $push: { "messages": mesaj } });*/
      console.log(clasa + " " + nume + " a primit un mesaj!");

      res.send('success');
    }
  }

  async function check(mongoClient) {
    if (clasa == "Clasa" || nume == "Nume" || mesaj.length == 0)
      return null;
    let response = await mongoClient.db("odo_valentine").collection("odo_valentine")
      .findOne({ name: nume, "class": clasa });
    if(response == null)
    response = await mongoClient.db("odo_valentine").collection("odo_valentine")
      .findOne({ name: nume + " ", "class": clasa });
    return response;
  }

  update();
})

function checkAuthenticated(req, res, next) {
  let token = req.cookies['session-token'];

  let user = {};
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    user.name = titleCase(payload.name);
    user.email = payload.email;
  }

  verify()
    .then(() => {
      if (user.email.endsWith('cnodobescu.ro')) {
        req.user = user;
        next();
      } else {
        res.clearCookie('session-token')
        res.redirect('/warn')
      }
    })
    .catch(err => {
      res.redirect('/login')
    })
}

function titleCase(str) {
  return str.toLowerCase().split(' ').map(function (word) {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
}

app.listen(PORT, () => console.log(`Listening on ${PORT}`))