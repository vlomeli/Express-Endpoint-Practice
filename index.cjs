const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get('/cars', async function(req, res) {
  try {
  // Query the car table where deleted_flag is 0
  const result = await req.db.query('SELECT * FROM car_data.cars WHERE deleted_flag = 0');

  // Send the data to the front end
  res.json({ success: true, message: 'Cars data retrieved', data: result[0] });
} catch (err) {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
}
});

app.use(async function(req, res, next) {
  try {
    console.log('Middleware after the get /cars');
  
    await next();

  } catch (err) {
    res.status(500).send('Internal Server Error')
  }
});

app.post('/cars', async function(req, res) {
  try {
    const { make, model, year } = req.body;
  
    const query = await req.db.query(
      `INSERT INTO car (id, make, model, year) 
       VALUES (:id, :make, :model, :year)`,
      {
        id,
        make,
        model,
        year,
      }
    );
  
    res.json({ success: true, message: 'Car successfully created', data: null });
  } catch (err) {
    res.json({ success: false, message: err, data: null })
  }
});

app.delete('/cars/:id', async function(req,res) {
  try {
    const carId = req.params.id;

    const updateResult = await req.db.query('UPDATE car_data.cars SET deleted_flag = 1 WHERE id = ?', [carId]);

    const resultSetHeader = updateResult[0];
    const affectedRows = resultSetHeader ? resultSetHeader.affectedRows : 0;
    
    if (affectedRows > 0) {
      res.json({ success: true, msg: 'Car deleted successfully'});
    } else {
      res.status(404).json({ success: false, msg: 'Car not found'});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Internal server error'});
  }
});

app.put('/cars/:id', async function(req,res) {
  try {
    const { make, model, year } = req.body;
    const carId = req.params.id; // Extract car ID from the URL parameters

    // Update the 'cars' table
    const query = await req.db.query(
      `UPDATE cars 
       SET make = :make, model = :model, year = :year
       WHERE id = :carId`,
       {
        make, 
        model,
        year,
        carId,
       }
    );

    // check if update was successful
    if (query.affectedRows === 0) {
      return res.json({ success: false, msg: 'Car not found', data: null });
    } 

    res.json ({ success: true, msg: 'Car successfully updated', data: null });
  } catch (err) {
    res.json({ success: false, msg: err.message, data: null });
  }
});


app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));