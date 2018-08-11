const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors')
const knex = require('knex')

const db = knex({
    
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'antonwy',
        password : '',
        database : 'todo-list'
    }
      
})



const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    //res.send(database.users)
});

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    
    db.select('*').from('users').where({id})
        .then(user => {
            if(user.length){
                res.json(user[0]);
            }else{
                res.status(400).json('Not found!')
            }
        }).catch(err => res.status(400).json('error getting user'))

});

app.post('/signin', (req, res) => {

    const email = req.body.email.toLowerCase();

    db.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if(isValid){
                return db.select('*').from('users')
                    .where('email', '=', email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json("unable to get user"))
            }else{
                res.status(400).json("wrong password")
            }
            
        })
        .catch(err => res.status(400).json('wrong email'))

});

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;

    const hash = bcrypt.hashSync(password);

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email.toLowerCase()
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0],
                        name: name,
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
        .catch(error => res.status(400).json("unable to register"))
});

app.get('/tasks', (req, res) => {
    db.select('*').from('tasks')
        .orderBy('created', 'ABSC')
        .then(data => {
            res.json(data);
        })
        .catch(err => res.status(400).json("something went wrong!"))
});

app.post('/tasks/new', (req, res) => {
    db.insert({
        todo: req.body.todo,
        created: new Date(),
    })
    .into('tasks')
    .returning('todo')
    .then(todo => {
        res.json(todo);
    })
    .catch(err => res.status(400).json(err))
})

app.delete('/tasks/delete/:id', (req, res) => {
    db.delete('*').from('tasks').where('id', '=', req.params.id)
        .then(data => res.json(`Task ${req.params.id} deleted!`))
        .catch(err => res.status(400).json(err))
})

app.put('/tasks/update/:id', (req, res) => {
    db.select('todo').from('tasks').where('id', '=', req.params.id)
        .update({todo: req.body.todo})
        .returning('*')
        .then(data => res.json(data))
        .catch(err => res.status(400).json(err))
});

app.put('/tasks/checked/:id', (req, res) => {
    db.select('checked').from('tasks').where('id', '=', req.params.id)
        .update({checked: req.body.checked})
        .returning('*')
        .then(data => res.json(data))
        .catch(err => res.status(400).json(err))
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});