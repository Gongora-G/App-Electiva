require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
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

// Conexión a la base de datos MySQL usando la URL de conexión de Railway
const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
    if (err) {
        console.log('Error al conectar con la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos exitosa.');
});

// Middleware para definir `user` en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
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

//---------------------------------------------------------------------------------------------------------------------------------
// Middleware para inicializar el carrito en la sesión
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

  // Ruta para añadir al carrito
// Ruta para añadir al carrito
// Ruta para añadir al carrito
app.post('/add-to-cart', (req, res) => {
    const { id, name, price } = req.body;

    // Crear el objeto del producto
    const product = {
        id,
        name,
        price
    };

    // Añadir el producto al carrito en la sesión
    if (!req.session.cart) {
        req.session.cart = [];
    }
    req.session.cart.push(product);

    res.redirect('/cart');  // Redirige al carrito después de agregar el producto
});


  // Ruta para mostrar el carrito
app.get('/my-cart', (req, res) => {
    res.render('my-cart', { cart: req.session.cart });
  });
  
// Ruta para eliminar un producto del carrito
app.post('/remove-from-cart', (req, res) => {
    const { id } = req.body;

    // Filtra los productos para eliminar el que tiene el ID dado
    req.session.cart = req.session.cart.filter(item => item.id != id);

    res.redirect('/cart');
});
app.post('/clear-cart', (req, res) => {
    req.session.cart = []; // Vaciamos el carrito en la sesión
    res.json({ success: true });
});




//---------------------------------------------------------------------------------------------------------------------------------

// Ruta para mostrar el formulario de registro
app.get('/register', (req, res) => {
    res.render('register');
});

// Ruta para manejar la solicitud de registro
app.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;

    // Verifica si el correo ya existe
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.render('register', { errorMessage: 'Hubo un error al verificar el correo electrónico.' });
        }

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
    // Ejemplo de productos (esto debería ser obtenido de tu base de datos en un caso real)
    const products = [
        { id: 1, name: "Producto 1", price: 9.99, image: "images/img-pro-01.jpg" },
        { id: 2, name: "Producto 2", price: 14.99, image: "images/img-pro-02.jpg" },
        { id: 3, name: "Producto 3", price: 7.99, image: "images/img-pro-03.jpg" }
    ];

    const cart = req.session.cart || []; // Para manejar el carrito

    res.render('shop', { products, cart }); // Pasamos products y cart a la vista
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
    res.render('cart', { cart: req.session.cart || [], user: req.session.user || null });
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
