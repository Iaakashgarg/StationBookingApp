const Pool = require('pg').Pool

// Database configuration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'codebrewDB',
    password: 'password',
    port: 5432,
})


const getUserById = (id) => {
    return new Promise(function (resolve, reject) {
        pool.query('SELECT * FROM users WHERE user_id = $1', [id], (error, results) => {
            if (error) {
                reject(error)
            }
            resolve(results.rows)
        })
    })
}

const getUserByUsername = (email, username) => {
    return new Promise(function (resolve, reject) {
        pool.query('SELECT * FROM users WHERE username = $1 or email = $2',
            [username, email], (error, results) => {
                if (error) {
                    reject(error)
                }
                resolve(results.rows)
            })
    })
}

const createUser = (request) => {
    const { name, email, password, contact, username } = request.body
    return new Promise(function (resolve, reject) {
        pool.query(`INSERT INTO users (fullname, email, password, 
    contact_no, username, user_status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [name, email, password, contact, username, 'Active'], (error) => {
                if (error) {
                    reject(error)
                }
                resolve()
            })
    })
}


const updateUserStatus = (id, status) => {
    return new Promise(function (resolve, reject) {
        pool.query(
            'UPDATE users SET user_status = $1 WHERE user_id = $2',
            [status, id],
            (error, results) => {
                if (error) {
                    reject(error)
                }
                resolve(results.rowCount)
            }
        )
    })
}

const updatePicture = (type, image_url, id) => {
    let table, table_id;
    if (type === undefined || type === null) {
        reject(`Invalid Type`)
    } else {
        if (type.toLowerCase() === 'user') {
            table = 'users';
            table_id = 'user_id';
        }
        else if (type.toLowerCase() === 'station') {
            table = 'station';
            table_id = 'station_id';
        }
        else {
            reject(`Invalid Type`)
        }
    }
    return new Promise(function (resolve, reject) {
        pool.query(
            `UPDATE ${table} SET image_url = $1 WHERE ${table_id} = $2`,
            [image_url, id],
            (error, results) => {
                if (error) {
                    reject(error)
                }
                resolve(results.rowCount)
            }
        )
    })
}

const getUserBookings = (id) => {
    return new Promise(function (resolve, reject) {
        pool.query(`SELECT bk.booking_id, bk.booking_date, bdt.vehicle_number,
            sc.service_name, us.fullname
            FROM booking bk
            inner join booking_details bdt on bk.booking_id = bdt.booking_id
            inner join users us on us.user_id = bk.user_id
            inner join services sc on sc.service_id = bdt.service_id
            WHERE station_id = $1 and us.user_status = 'Active'`,
            [id], (error, results) => {
                if (error) {
                    reject(error)
                }
                resolve(results.rows)
            })
    })
}

const createUserBooking = (request) => {
    const { date, userId } = request.body
    const services = JSON.parse(JSON.stringify(request.body.services));
    var bookingId;
    return new Promise(function (resolve, reject) {
        pool.query(`INSERT INTO booking (booking_date, user_id) VALUES ($1, $2) 
    RETURNING booking_id`,
            [date, userId], (error, results) => {
                if (error) {
                    reject(error)
                }
                bookingId = results.rows[0].booking_id
                services.forEach(element => {
                    pool.query(`INSERT INTO booking_details (booking_id, vehicle_number,
             service_id) VALUES ($1, $2, $3)`,
                        [bookingId, element.vehicleNum, element.serviceId], (error, results) => {
                            if (error) {
                                reject(error)
                            }

                        })
                });
                resolve(`New Booking created with ID: ${bookingId}`)
            })
    })
}

const getStationsList = (location) => {
    return new Promise(function (resolve, reject) {
        pool.query(`SELECT st.station_id, st.station_name, st.contact_no,
        st.image_url,
        ST_Distance(st.station_location, 'SRID=4326;Point(${location.longitude} ${location.latitude})')
        AS distance
      FROM
        station st
      ORDER BY
        st.station_location <-> 'SRID=4326;Point(${location.longitude} ${location.latitude})'::geometry`,
            (error, results) => {
                if (error) {
                    reject(error)
                }
                else {
                    resolve(results.rows)
                }
            })
    })
}

const login = (username, password) => {
    return new Promise(function (resolve, reject) {
        pool.query('SELECT * FROM users WHERE username = $1 and password = $2',
            [username, password], (error, results) => {
                if (error) {
                    reject(error)
                }
                else {
                    resolve(results.rows)
                }
            })
    })
}

const addNewStation = (request) => {
    const { name, contact, location } = request.body
    return new Promise(function (resolve, reject) {
        pool.query(`INSERT INTO station (station_name, contact_no, station_location) VALUES ($1, $2,
             ST_GeomFromText('Point(${location.longitude} ${location.latitude})', 4326))`,
            [name, contact], (error) => {
                if (error) {
                    reject(error)
                }
                resolve()
            })
    })
}

const updateStationId = (stationId, bookingId) => {
    return new Promise(function (resolve, reject) {
        pool.query(
            'UPDATE booking SET station_id = $1 WHERE booking_id = $2',
            [stationId, bookingId],
            (error, results) => {
                if (error) {
                    reject(error)
                }
                resolve(results.rowCount)
            }
        )
    })
}


module.exports = {
    getUserById,
    createUser,
    updateUserStatus,
    getUserBookings,
    updatePicture,
    createUserBooking,
    login,
    getStationsList,
    getUserByUsername,
    addNewStation,
    updateStationId
}