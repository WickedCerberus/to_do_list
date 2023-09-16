const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');
const date = require(__dirname + '/date.js');
require('dotenv').config();

const app = express();
const { Schema, model } = mongoose;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

const connectToDatabase = async () => {
  try {
    await mongoose.connect(
      `mongodb+srv://${username}:${password}@cluster0.j953cb3.mongodb.net/todolistDB`
    );
    console.log('Successfully connected to database');
  } catch (err) {
    console.log(`Error connecting to database ${err}`);
  }
};

connectToDatabase();

const itemsSchema = new Schema({
  name: String,
});

const Item = model('Item', itemsSchema);

const item1 = new Item({
  name: 'Welcome to your to do list!',
});
const item2 = new Item({
  name: 'Hit the + button to add a new item.',
});
const item3 = new Item({
  name: '<-- Hit this to delete an item.',
});

const defaultItems = [item1, item2, item3];

let defaultItemsInserted = false;

const listSchema = new Schema({
  name: String,
  items: [itemsSchema],
});

const List = model('List', listSchema);

app.get('/', async (req, res) => {
  try {
    const day = date.getDate();
    const items = await Item.find().exec();
    if (items.length === 0 && !defaultItemsInserted) {
      const result = await Item.insertMany(defaultItems);
      console.log(`Successfully inserted default documents \n ${result}`);
      defaultItemsInserted = true;
      res.redirect('/');
    } else {
      res.render('list', { day: day, listName: 'List', items: items });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get('/:listName', async (req, res) => {
  try {
    const day = date.getDay();
    const listName = _.capitalize(req.params.listName);
    const list = await List.findOne({ name: listName }).exec();

    if (!list) {
      const newList = await List.create({
        name: listName,
        items: defaultItems,
      });
      res.redirect(`/${listName}`);
      console.log(`Successfully created new list: \n ${newList}`);
    } else {
      res.render('list', { day: day, listName: listName, items: list.items });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post('/', async (req, res) => {
  try {
    const listName = req.body.listName;
    const itemName = req.body.newItem;

    const newItem = new Item({
      name: itemName,
    });

    if (listName === 'List') {
      await newItem.save();
      res.redirect('/');
    } else {
      const list = await List.findOne({ name: listName }).exec();
      list.items.push(newItem);
      const updatedList = await list.save();

      res.redirect(`/${listName}`);
      console.log(`Successfully inserted items to list: ${updatedList}`);
    }
  } catch (err) {
    console.log(`Error inserting items to list: ${err}`);
  }
});

app.post('/delete', async (req, res) => {
  try {
    const checkItemId = req.body.checkItemId;
    const listName = req.body.listName;
    let result = {};

    if (listName === 'List') {
      result = await Item.findByIdAndDelete(checkItemId);
      res.redirect('/');
    } else {
      result = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkItemId } } },
        { new: true }
      );
      res.redirect(`/${listName}`);
    }
    console.log(`Successfully deleted list Item: ${result}`);
  } catch (err) {
    console.log(`Error deleting List Item: ${err}`);
  }
});

process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect();
    console.log('Successfully disconnected from database');
    process.exit(0);
  } catch (err) {
    console.log(`Error disconnecting from database: ${err}`);
  }
});

process.on('SIGTERM', async () => {
  try {
    await mongoose.disconnect();
    console.log('Successfully disconnected from database');
    process.exit(0);
  } catch (err) {
    console.log(`Error disconnecting from database: ${err}`);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is up and running on port 3000');
});
