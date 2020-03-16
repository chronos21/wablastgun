const express =require('express')
const app = express()
const fs = require('fs');
const { Client, MessageMedia } = require('whatsapp-web.js');
const PORT = process.env.PORT || 8080;
const SESSION_FILE_PATH = './session.json';


let state = {
    status: 'init',
    qr: ''
};


app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/setup', async(req, res) => {
    res.render('setup', {state})
})

app.get('/', (req, res) => {
    res.redirect('/state')
})

app.get('/reinit', async (req, res) => {
    let message = 'Re-Init'
    try{
        await client.destroy()
        client.initialize()
    } catch(err){
        message = 'Re-Init Failed'
    }
    res.json({state, message})
})

app.get('/reset', async (req, res) => {
    let message = 'Force Reset'
    try{
        await client.resetState()
    } catch(err){
        message = 'Force Reset Failed'
    }
    res.json({state, message})
})

app.get('/destroy-session', (req, res) => {
    try {
        fs.unlinkSync(SESSION_FILE_PATH)
        res.json({msg: 'Session Purge'})
      } catch(err) {
        console.error(err)
        res.json({msg: 'Purge Failed'})
      }
})

app.get('/state', (req, res)=>{
    res.json({state})
})

app.get('/contacts', async(req, res) => {
    try{
        let data = await client.getContacts()
        res.json({data})
    } catch(err){
        console.log(err)
        res.status(404).end()
    }
})

app.get('/send', async(req, res) => {
    try{
        let {id, message} = req.query
        let result = []
        id = id.split('|')
        if(!id && !message){
            return res.status(404).end()
        }
        console.log(id)
        for(let item of id){
            let data = await client.sendMessage(item, message)
            result.push(data)
        }
        res.json({result})
    } catch(err){
        console.log(err)
        res.json({err})
    }
})

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: true, args: [
    '--no-sandbox', 
    '--disable-setuid-sandbox'
]}, session: sessionCfg });

client.initialize()

client.on('qr', (qr) => {
    state.status = 'qr'
    state.qr = qr
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    state.status = 'authenticated'
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    state.status = 'auth_failure'
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    state.status = 'ready'
    console.log('READY');
});

client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

});

client.on('disconnected', (reason) => {
    state.status = 'disconnected'
    console.log('Client was logged out', reason);
});


app.listen(PORT, ()=> console.log('Stato'))