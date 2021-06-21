const express = require('express')
const app = express();
const db = require('./db')
const auth = require('./authentication')
const path = require("path")
const multer = require("multer")
const helpers = require('./helpers');
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }))


// Get Method for root path to test application
app.get('/', auth.authenticateToken, (res) => {
  res.send('Hello World!')
});

// Get Method to get user details by id
app.get('/user/:id', auth.authenticateToken,(req,res) => {
   db.getUserById(req.params.id).then((user) => {
    res.status(200).json(user)
   }).catch((err) => {
    res.status(400).send(err)
  });
})

// Get Method to get user(active users only) bookings by station id 
app.get('/bookings/:id', auth.authenticateToken, (request, response) => {
  db.getUserBookings(request.params.id).then((results) => {
    response.status(200).json(results)
  }).catch((err) => {
    response.status(400).send(err)
  });
})

// Put Method to update user status by admin
app.put('/update-status', auth.authenticateToken, (req, res) => {
  db.updateUserStatus(req.body.userId, req.body.status).then((rowCount) => {
    if (rowCount > 0) {
    res.send(`User status modified!!`)
    }
    else {
      res.status(400).send('Please Try Again!')
    }
  }).catch((err) => {
    res.status(400).send(err)
  });
})

// Login method to get authentication token on basis of username and password
app.post('/login', (req, res) => {
  db.login(req.body.username, req.body.password).then((result) => {
    if (result.length > 0) {
      const token = auth.generateAccessToken({ username: req.body.username });
      res.json(token);
    }
    else {
      res.sendStatus(401);
    }
  }).catch((err) => {
    res.status(400).send(err)
  })
})

// Post method to register new user into the application and returns auth token
app.post('/new-user', (req, res) => {
  db.getUserByUsername(req.body.email, req.body.username).then((user) => {
    if (user.length > 0) {
      res.status(400).send('User already exists!!')
    }
    else {
      db.createUser(req).then(() => {
        const token = auth.generateAccessToken({ username: req.body.username });
        res.status(200).json(token)
      })
        .catch((err) => {
          res.status(400).send(err)
        });
    }
  }).catch((err) => {
    res.status(400).send(err)
  });

})

// Post method to create request for new booking, returns list of stations from nearest to farthest
app.post('/new-booking', auth.authenticateToken, (req, res) => {
  db.createUserBooking(req).then(() => {
    db.getStationsList(req.body.location).then((result) => {
      res.status(200).json(result)
    }).catch((err) => {
      res.status(400).send(err)
    });
  })
    .catch((err) => {
      res.status(400).send(err)
    });
})

// Put method to book station after selecting station id
app.put('/book-station', auth.authenticateToken, (req, res) => {
  db.updateStationId(req.body.stationId, req.body.bookingId).then((response) => {
    if (response > 0) {
      res.send('Station Booking has been Confirmed!!')
    }
    else {
      res.status(400).send('Please try again!!')
    }
  }).catch((err) => {
    res.status(400).send(err)
  });
})

// Post method to register new station details into the application
app.post('/new-station', auth.authenticateToken, (req, res) => {
  db.addNewStation(req).then(() => {
    res.send('New Station Registered Successfully!!')
  }).catch((err) => {
    res.status(400).send(err)
  });
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'assets/');
  },

  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const maxSize = 3 * 1000 * 1000;

// File upload method to upload image files
app.post('/upload-pic', auth.authenticateToken, (req, res) => {
  let upload = multer({
    storage: storage, limits: { fileSize: maxSize },
    fileFilter: helpers.imageFilter
  }).single('picture');

  upload(req, res, function (err) {
    if (req.fileValidationError) {
      return res.status(400).send(req.fileValidationError);
    }
    else if (!req.file) {
      return res.status(400).send('Please select an image to upload');
    }
    else if (err instanceof multer.MulterError) {
      return res.status(400).send(err);
    }
    else if (err) {
      return res.status(400).send(err);
    }

    const image_path = __dirname + `\\` + req.file.path;
    const data = JSON.parse(req.body.data)
    db.updatePicture(data.type, image_path, data.id).then((rowCount) => {
      if (rowCount > 0) {
      res.send('File Uploaded Successfully');
      }
      else {
        res.status(400).send('File Upload Failed, Please Try Again!')
      }
    })
      .catch((err) => {
        res.status(400).send(err)
      });
  });
});



app.listen(port, () => console.log(`Starting the server on port ${port}...`))