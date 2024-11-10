const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();

// Configuración de body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configura archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'freshshop-master')));

// Configura el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesiones
app.use(session({
    secret: 'korean_wave_secret',
    resave: false,
    saveUninitialized: true,
}));

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'korean_wave'
});
// Middleware para definir `user` en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});


db.connect((err) => {
    if (err) {
        console.log('Error al conectar con la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos exitosa.');
});

// Ruta para la página principal
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user || null });
});

// Ruta para mostrar la página de contacto
app.get('/contact-us', (req, res) => {
    res.render('contact-us', { user: req.session.user || null });
});


// Ruta para manejar el formulario de contacto
app.post('/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    const query = 'INSERT INTO contact_form (name, email, subject, message) VALUES (?, ?, ?, ?)';
    db.query(query, [name, email, subject, message], (err, result) => {
        if (err) {
            console.log('Error al insertar los datos:', err);
            res.status(500).send('Error al guardar el mensaje.');
        } else {
            res.send('Mensaje enviado correctamente.');
        }
    });
});

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
    res.render('register');
});

// Ruta para manejar la solicitud de registro
app.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;

    // Verifica si el correo ya existe
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (results.length > 0) {
            res.render('register', { errorMessage: 'El correo electrónico ya está registrado.' });
        } else {
            // Continúa con el registro si no existe
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = 'INSERT INTO users (nombre, email, password) VALUES (?, ?, ?)';
            db.query(query, [nombre, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error al insertar datos:', err);
                    res.render('register', { errorMessage: 'Hubo un error al registrar el usuario.' });
                } else {
                    res.redirect('/login');
                }
            });
        }
    });
});

// Ruta para mostrar el formulario de inicio de sesión
app.get('/login', (req, res) => {
    res.render('login', { errorMessage: null });
});

// Ruta para el inicio de sesión de usuarios
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.log('Error al buscar el usuario:', err);
            return res.render('login', { errorMessage: 'Error en el servidor. Por favor, inténtalo más tarde.' });
        }
        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = { id: user.id, nombre: user.nombre, email: user.email };
                return res.redirect('/');
            } else {
                return res.render('login', { errorMessage: 'Contraseña incorrecta.' });
            }
        } else {
            return res.render('login', { errorMessage: 'Usuario no encontrado.' });
        }
    });
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.redirect('/');
    });
});


// Ruta para la página de cuenta del usuario (my-account.ejs)
app.get('/my-account', (req, res) => {
    if (req.session.user) {
        res.render('my-account', { user: req.session.user });
    } else {
        res.redirect('/login');
    }
});

// Ruta para la página de detalles de la tienda (shop-detail.ejs)
app.get('/shop-detail', (req, res) => {
    res.render('shop-detail', { user: req.session.user || null });
});

// Ruta para la tienda (shop.ejs)
app.get('/shop', (req, res) => {
    res.render('shop', { user: req.session.user || null });
});

// Ruta para la lista de deseos (wishlist.ejs)
app.get('/wishlist', (req, res) => {
    res.render('wishlist', { user: req.session.user || null });
});

// Ruta para la página "Sobre Nosotros" (about.ejs)
app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

// Ruta para la página de carrito (cart.ejs)
app.get('/cart', (req, res) => {
    res.render('cart', { user: req.session.user || null });
});

// Ruta para la página de finalizar compra (checkout.ejs)
app.get('/checkout', (req, res) => {
    res.render('checkout', { user: req.session.user || null });
});

// Ruta para la página de contacto (contact-us.ejs)
app.get('/contact-us', (req, res) => {
    res.render('contact-us', { user: req.session.user || null });
});

// Ruta para la galería (gallery.ejs)
app.get('/gallery', (req, res) => {
    res.render('gallery', { user: req.session.user || null });
});
// Servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
