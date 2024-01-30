const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let db = null;

const initialABAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server At Running http://localhost:3000");
    });
  } catch (e) {
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
};

initialABAndServer();

app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  let userQuery = `
    SELECT 
    *
    FROM 
    user
    WHERE username = '${username}'`;
  const dbUser = await db.get(userQuery);
  if (dbUser === undefined) {
    let userDetails = `
        INSERT INTO
        user (username, name, password, gender, location)
        VALUES(
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}');`;

    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let user = await db.run(userDetails);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const loginDetails = `
    SELECT 
    *
    FROM
    user
    WHERE username = '${username}'`;
  const login = await db.get(loginDetails);
  if (login === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPassword = await bcrypt.compare(password, login.password);
    if (isPassword === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userDetails = `
    SELECT 
    *
    FROM 
    user
    WHERE username = '${username}'`;
  const dbUser = await db.get(userDetails);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const validPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (validPassword === true) {
      const lengthOfPassword = newPassword.length;
      if (lengthOfPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatedPassword = `
                UPDATE user
                SET password = '${encryptedPassword}'
                WHERE username = '${username}'`;
        await db.run(updatedPassword);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
