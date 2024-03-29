import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import uuid from 'node-uuid';
import {Post, User} from './sequelize/';
import aws from 'aws-sdk';


const app = express();
const PORT = process.env.PORT || 8000;
const S3_BUCKET = process.env.S3_BUCKET;

app.use(bodyParser.json({limit:'50mb'}));
app.use(cors());

app.post('/email', async (req, res) => {
  try{
    var helper = require('sendgrid').mail;
    var from_email = new helper.Email('manuelntu15@gmail.com');
    var to_email = new helper.Email('manuelntu@yahoo.com.sg');
    var subject = 'Feedback on the site';

    var content = new helper.Content('text/plain', req.body.feedback);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });

    sg.API(request, function(error, response) {
      console.log(response.statusCode);
      console.log(response.body);
      console.log(response.headers);
    });
    return request.json({content: content});
  } catch (err) {
    console.log(err)
    return res.json({error: err});
  }
});

app.get('/sign-s3', (req, res) => {
  const s3 = new aws.S3();
  const fileName = req.query['file-name'];
  const fileType = req.query['file-type'];
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
});

app.get('/users', async (req, res) => {
  try {
    let users = await User.findAll();
    users = users.map((user) => user.get({plain: true}));

    return res.json({users});
  } catch (err) {
    return res.json({error: err});
  }
});

app.post('/users', async (req, res) => {
  try {
    const user = await User.create({
      id: uuid.v4(),
      email: req.body.email,
      password: req.body.password
    });

    return res.json(user.get({plain: true}));
  } catch (err) {
    return res.json({error: err});
  }
});

app.get('/posts', async (req, res) => {
  try {
    let posts = await Post.findAll();
    posts = posts.map((post) => post.get({plain: true}));

    return res.json({posts});
  } catch (err) {
    return res.json({error: err});
  }
});

app.post('/posts', async (req, res) => {
  try {
    const post = await Post.create({
      id: uuid.v4(),
      userId: req.body.userId,
      price: req.body.price,
      title: req.body.title,
      description: req.body.description,
      image: req.body.image,
      condition: req.body.condition
    });

    return res.json(post.get({plain: true}));
  } catch (err) {
    return res.json({error: err});
  }
});


app.get('/search', async (req, res) => {
  // If it's an empty search, we might want to show most popular newest ads down the line
  try {
    let result = await Post.findAll({
        order: "created_at DESC"
      });
      result = result.map((result) => result.get({plain: true}));

    return res.json({result});
  } catch (err) {
    return res.json({error: err});
  }
});

app.get('/search/:title', async (req, res) => {
  // If there is actually a search term provided
  try {
      var searchTerm = req.params.title.replace(/-/g, "%") //When passed, spaces were replaced with '-'
      searchTerm
      let result = await Post.findAll({
        where: { $or: {
          title: { ilike: '%' + searchTerm + '%'},
          description: { ilike: '%' + searchTerm + '%'},
          }
        },
        order: "CASE WHEN title ILIKE '" + searchTerm + "%' THEN 3 \
        WHEN title ILIKE '%" + searchTerm + "' THEN 1 \
        WHEN title ILIKE '%" + searchTerm + "%' THEN 2 \
        WHEN description ILIKE '%" + searchTerm + "%' THEN 0 \
        WHEN description ILIKE '%" + searchTerm + "%' THEN 0 END DESC, title",
        
      });
      result = result.map((result) => result.get({plain: true}));

    return res.json({result});
  } catch (err) {
    return res.json({error: err});
  }
});

app.listen(PORT, () => {
  console.log('Node app is running on port', PORT);
});
