let jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const updateProducts = require('./web_soket').updateProducts;

let PATH = __dirname + '\\uploads';
const secretKey = "myTestSecretKey";

module.exports = function(app, db) {
    app.use(function(req, res, next) {
        if (process.env.DATABASE_URL) {
            res.header("Access-Control-Allow-Origin", "https://sushibar.herokuapp.com");
        }
        else {
            res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        }
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

        if (['/goods/create', '/goods/update', '/goods/delete', '/saveData'].includes(req.originalUrl)) {
            let object = convertToObj(req.body);
            jwt.verify(object.token, secretKey, async function(err, decoded) {
                if (err) return res.send(false);
                if (!decoded.isAdmin) return res.send(false);
                next();
            });
        }
        else {
            next();
        }
    });
    app.post('/loginByToken', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                token: object.oAuthToken
            }
        });
        if (user == null) {
            user = await db.Models.User.create({
                login: object.login,
                isAdmin: false,
                token: object.oAuthToken
            });
        }
        let token = jwt.sign({ login: user.login, isAdmin: user.isAdmin }, secretKey);
        res.send({
            login: user.login,
            isAdmin: user.isAdmin,
            token: token
        });
    });
    app.post('/login', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                login: object.login
            }
        });
        if (user != null) {
            if (!comparePassword(object.password, user.password)) return res.send(false);
            let token = jwt.sign({ login: object.login, isAdmin: user.isAdmin }, secretKey);
            res.send({
                login: user.login,
                isAdmin: user.isAdmin,
                token: token
            });
        }
        else {
            res.send(false);
        }
    });
    app.post('/register', async (req, res) => {
        let object = convertToObj(req.body);
        
        let user = await db.Models.User.findOne({
            where: {
                login: object.login
            }
        });
        if (user == null) {
            let newUser = await db.Models.User.create({
                login: object.login,
                password: hashPassword(object.password),
                isAdmin: false
            });
            res.send({
                login: newUser.login,
                isAdmin: newUser.isAdmin,
                token: jwt.sign({
                    login: object.login,
                    isAdmin: false
                }, secretKey)
            });
            
        }
        else {
            res.send(false);
        }
    });

    app.post('/goods', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        if (object == null || object.findText == null) object = {findText: ''};
        let products = await db.sequelize.query(`SELECT * FROM searchInSushis('${object.findText}');`);
        res.send(products[0]);
    });
    
    app.post('/goods/create', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let price = parseInt(object.price);
        if (object.name == null || object.description == null || isNaN(price) || object.url == null) return res.send(false);
        let product = await db.Models.Sushi.create({
            name: object.name,
            description: object.description,
            price: price,
            url: object.url,
        });
        res.send(product);
        updateProducts();
    });
    app.post('/goods/update', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
        let price = parseInt(object.price);
        if (isNaN(id) || object.name == null || object.description == null || isNaN(price) || object.url == null) return res.send(false);
        let product = await db.Models.Sushi.update({
            name: object.name,
            description: object.description,
            price: price,
            url: object.url,
        }, {
            where: {
                id: id,
            }
        });
        res.send(object);
        updateProducts();
    });
    app.post('/goods/delete', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
        if (isNaN(id)) return res.send(false);
        await db.Models.Sushi.destroy({
            where: {
                id: id,
            }
        });
        res.send(true);
        updateProducts();
    });
    app.post('/upload', upload.single('file'), (req, res) => {
        const { file } = req;
        if(!file){
            console.log('File null');
            return res.send(false);
        }
        dropbox({
            resource: 'files/upload',
            parameters:{
                path: '/' + file.originalname
            },
            readStream: fs.createReadStream(path.resolve(PATH, file.originalname))
        }, (err, result, response) =>{
            if (err) return console.log(err);

            console.log('uploaded dropbox');
            res.send(true);
        });
    });
};

let convertToObj = function(obj) {
    return JSON.parse(obj.data);
};

let hashPassword = (passwordNotHashed) => {
    return bcrypt.hashSync(passwordNotHashed, bcrypt.genSaltSync(3));
};
let comparePassword = (password, hash) => {
    return bcrypt.compareSync(password, hash);
};

let storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, PATH);
    },
    filename:(req, file, cb) => {
        cb(null, file.originalname)
    }
});
let upload = multer({
    storage: storage,
});