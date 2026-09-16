import express from 'express'
import helmet from 'helmet';
import Helper from './Util/Helper.js'
import Config from './Util/Config.js';
import Upload from './Util/Upload.js';
import router from './router/manage.js';
import multer from 'multer'

var app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({limit:'50mb',extended:true}));
app.use((req, res, next) => {
    if (String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
        return next();
    }

    return multer().none()(req, res, next);
})

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Expose-Headers', 'Authorization, Content-Disposition');
    res.setHeader("Access-Control-Allow-Headers", 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, PUT, PATCH, GET, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).send('');
    }
    req.query =  Helper.xss(req.query || {});
    req.body =  Helper.xss(req.body || {});
    next();
});

app.use(express.static('public'))
app.use(express.static(Upload.UPLOAD_ROOT, {
    setHeaders: Upload.setStaticHeaders
}))
app.use(router);
app.use((req, res, next) => {
    res.status(403).send('Access Forbidden');
});

app.listen(Config.MANAGE_API_PORT);

console.log('listen:'+Config.MANAGE_API_PORT)
