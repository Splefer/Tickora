CREATE SCHEMA Tickora_DB;
USE Tickora_DB;

CREATE TABLE roles (
	role_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(63) NOT NULL UNIQUE
);

CREATE TABLE users (
	user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    surname VARCHAR(127) NOT NULL,
    forename VARCHAR(127) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    pass VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6) DEFAULT NULL,
    address VARCHAR(1000) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role INT NOT NULL,
    FOREIGN KEY (role) REFERENCES roles(role_id)  ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE venues (
	venue_id VARCHAR(10) NOT NULL PRIMARY KEY,
    venue_name VARCHAR(255) NOT NULL,
    venue_address VARCHAR(1000) NOT NULL,
    province CHAR(2),
    capacity INT NOT NULL
);

CREATE TABLE upcoming_events (
	event_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    cancellation_window_hours INT DEFAULT 120,
    description LONGTEXT,
    venue VARCHAR(10) NOT NULL,
    FOREIGN KEY (venue) REFERENCES venues(venue_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    organizer_id INT NOT NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE performer_links (
	link_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    performer_id INT NOT NULL,
    manager_id INT NOT NULL,
    FOREIGN KEY (performer_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (performer_id, manager_id)
);

CREATE TABLE event_performers (
	event_id INT NOT NULL,
    performer_id INT NOT NULL,
    PRIMARY KEY (event_id, performer_id),
    FOREIGN KEY (event_id) REFERENCES upcoming_events(event_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (performer_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE bookings (
	booking_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN DEFAULT FALSE,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)  ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES upcoming_events(event_id)  ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE ticket_types (
	type_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tier VARCHAR(20) NOT NULL,
    price DECIMAL(8,2) NOT NULL CHECK (price > 0),
    event_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES upcoming_events(event_id)  ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE tickets (
	booking_id INT NOT NULL,
    seat_id VARCHAR(10) NOT NULL,
    PRIMARY KEY (booking_id, seat_id),
    type_id INT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (type_id) REFERENCES ticket_types(type_id)  ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE payments (
	payment_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    stripe_session_id VARCHAR(255) DEFAULT NULL,
    stripe_payment_intent VARCHAR(255) DEFAULT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'cad',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid | failed
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO roles (role_name) VALUES
    ('customer'),
    ('manager'),
    ('performer'),
    ('organizer');
