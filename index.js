const express =require('express')
const app = express()
const { Client, MessageMedia } = require('whatsapp-web.js');
const PORT = 3012 || process.env.PORT;
// const SESSION_FILE_PATH = './session.json';
const multer  = require('multer')
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

let state = {
    status: 'init',
    qr: ''
};

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));

app.get('/setup', async(req, res) => {
    res.render('setup', {state})
})

app.get('/', (req, res) => {
    res.redirect('/send')
})

app.get('/reinit', async (req, res) => {
    let message = 'Re-Init'
    try{
        await client.destroy()
        client.initialize()
        state.status = 're-init'
    } catch(err){
        console.log(err)
        message = 'Re-Init Failed'
    }
    res.json({state, message})
})

app.get('/stop', async(req, res) => {
    let message = 'Stop'
    try{
        await client.destroy()
    } catch(err){
        message = 'Stop Failed'
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

// app.get('/destroy-session', (req, res) => {
//     try {
//         fs.unlinkSync(SESSION_FILE_PATH)
//         res.json({msg: 'Session Purge'})
//       } catch(err) {
//         console.error(err)
//         res.json({msg: 'Purge Failed'})
//       }
// })

app.get('/state', (req, res)=>{
    res.json({state})
})

app.get('/contacts', async(req, res) => {
    try{
        let {json} = req.query
        let data = await client.getContacts()
        if(json){
            res.json({data})
        } else {
            res.render('contacts', {data})
        }
    } catch(err){
        console.log(err)
        res.status(404).end()
    }
})

app.get('/send', async(req, res) => {
    if(state.status === 'qr' ){
        res.redirect('/setup')
    }
    try{
        let contacts = await client.getContacts()
        res.render('form', {contacts})
    } catch (err){
        res.status(404).end()
    }
})

app.post('/send', upload.single('image'), async(req, res) => {
    let {ids, message} = req.body
    if(!ids){
        return res.status(404).end()
    }
    let results = []
    if(!Array.isArray(ids)){
        ids = ids.trim().split('|')
    }
    let imageContent = null;
    
    if(req.file){
        let mimetype = req.file.mimetype
        let base64Img = req.file.buffer.toString('base64')
        imageContent = new MessageMedia(mimetype, base64Img)
    }

    for(let id of ids){
        let result = {id, status: 'Failed'}
        try{
            if(imageContent){
                await client.sendMessage(id, imageContent)
            }
            if(message){
                await client.sendMessage(id, message)
            }
            result.status = 'Success'
        } catch(err){
            result.status = 'Failed'
        }
        results.push(result)
    }
    res.json({ids, message, results})
})

// let sessionCfg;
// if (fs.existsSync(SESSION_FILE_PATH)) {
//     sessionCfg = require(SESSION_FILE_PATH);
// }

const client = new Client({ puppeteer: { headless: true, args: [
    '--no-sandbox', 
    '--disable-setuid-sandbox'
]}});

client.initialize()

client.on('qr', (qr) => {
    state.status = 'qr'
    state.qr = qr
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    state.status = 'authenticated'
    // sessionCfg = session;
    // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
    //     if (err) {
    //         console.error(err);
    //     }
    // });
});

client.on('auth_failure', msg => {
    state.status = 'auth_failure'
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