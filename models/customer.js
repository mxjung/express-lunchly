/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, reservations }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.reservations = reservations;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** return filtered customers by name. */

  static async filterByName(term1, term2) {

    let results;
    if (term1 && term2) {
      results = await db.query(
        `SELECT id, 
           first_name AS "firstName",  
           last_name AS "lastName", 
           phone, 
           notes 
          FROM customers 
            WHERE lower(first_name) like $1 
            AND lower(last_name) like $2`,
        [`%${term1.toLowerCase()}%`, `%${term2.toLowerCase()}%`]
      );
    } else {
      results = await db.query(
        `SELECT id, 
           first_name AS "firstName",  
           last_name AS "lastName", 
           phone, 
           notes 
          FROM customers 
            WHERE lower(first_name) like $1 
            OR lower(last_name) like $1`,
        [`%${term1.toLowerCase()}%`]
      );
    }

    const customers = results.rows;

    if (customers === undefined) {
      const err = new Error(`No customer has made a reservation`);
      err.status = 404;
      throw err;
    }

    // return new Customer(customers);
    return results.rows.map(c => new Customer(c));
  }

  static async filterBest() {
    const results = await db.query(
        `SELECT c.id, 
           first_name AS "firstName",  
           last_name AS "lastName", 
           phone, 
           c.notes,
           COUNT(customer_id) as "reservations"
          FROM customers AS c
          JOIN reservations AS r
          ON c.id = r.customer_id 
            GROUP BY c.id
            ORDER BY COUNT(customer_id) DESC
            LIMIT 10`);

    const customers = results.rows;
    console.log("The best customers array is", customers);

    if (customers === undefined) {
      const err = new Error(`No customer has made a reservation`);
      err.status = 404;
      throw err;
    }

    // return new Customer(customers);
    return results.rows.map(c => new Customer(c));
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** get fullname for this customer. */

  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /** get number of reservations. */

  async numReservations() {
    const reservations = await this.getReservations();
    return reservations.length;
  }

}

module.exports = Customer;
