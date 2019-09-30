module.exports = function(app, db) {
    app.get('/test', async (req, res) => {
        res.send(`DB url ${process.env.DATABASE_URL}\n DB BRONZE ${process.env.HEROKU_POSTGRESQL_BRONZE_URL}`);
    }),
    app.post('/goods/create', async (req, res) => {
        await db.Models.Sushi.create({
            name: req.body.name,
            description: req.body.description,
            price: parseInt(req.body.price),
        });
        res.send('Created');
    });
    app.post('/goods/update', async (req, res) => {
        await db.Models.Sushi.update({
            name: req.body.name,
            description: req.body.description,
            price: parseInt(req.body.price),
        }, {
            where: {
                id: parseInt(req.body.id),
            } 
        });
        res.send('Updated');
    });
    app.post('/goods/delete', async (req, res) => {
        await db.Models.Sushi.destroy({
            where: {
                id: parseInt(req.body.id),
            } 
        });
        res.send('Deleted');
    });
};