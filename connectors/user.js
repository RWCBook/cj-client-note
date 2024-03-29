/*******************************************************
 * TPS - Task Processing Service
 * user connector (server)
 * May 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Complete Collection : B.B. King (2008)
 *******************************************************/

// handles HTTP resource operations 
var qs = require('querystring');
var wstl = require('./../wstl.js');
var utils = require('./utils.js');

var components = {};
components.user = require('./../components/user-component.js');

var content = "";
content += '<div class="ui segment">';
content += '<h3>Manage your TPS Users here.</h3>';
content += '<p>You can do the following:</p>';
content += '<ul>';
content += '<li>Add and Edit users</li>';
content += '<li>Change the password, view the tasks assigned to a user</li>';
content += '<li>Filter the list by Nickname or FullName</li>';
content += '</ul>';
content += '</div>';

module.exports = main;

// http-level actions for users
function main(req, res, parts, respond) {
  var flag;
  
  flag=false;
  switch (req.method) {
    case 'GET':
      if(flag===false && parts[1]==="update" && parts[2]) {
        flag=true;
        sendUpdatePage(req, res, respond, parts[2]);
      }
      if(flag===false && parts[1]==="pass" && parts[2]) {
        flag=true;
        sendPasswordPage(req, res, respond, parts[2]);
      }
      if(flag===false && parts[1] && parts[1].indexOf('?')===-1) {
        flag = true;
        sendItemPage(req, res, respond, parts[1]);
      }
      if(flag===false) {
        sendListPage(req, res, respond);
      }
    case 'POST':
      if(parts[1] && parts[1].indexOf('?')===-1) {
        switch(parts[1].toLowerCase()) {
          case "update":
            updateUser(req, res, respond, parts[2]); 
            break;
          case "pass":
            changePassword(req, res, respond, parts[2]); 
            break;
          default:
            respond(req, res, 
              utils.errorResponse(req, res, 'Method Not Allowed', 405)
            );          
            break;
        }
      }
      else {
        addUserItem(req, res, respond);
      }
      break;
      case 'PUT':
        if(parts[1] && parts[1].indexOf('?')===-1) {
          updateUser(req, res, respond, parts[1]);
        }
        else {
          respond(req, res, 
            utils.errorResponse(req, res, 'Method Not Allowed', 405)
          );          
        }
      break;
    default:
      respond(req, res, utils.errorResponse(req, res, 'Method Not Allowed', 405));
      break;
  }
}

function sendListPage(req, res, respond) {
  var doc, coll, root, q, qlist, code;

  root = '//'+req.headers.host;
  coll = [];
  data = [];
  
  // parse any filter on the URL line
  // or just pull the full set
  q = req.url.split('?');
  if(q[1]!==undefined) {
    qlist = qs.parse(q[1]);
    data = components.user('filter', qlist);
  }
  else {
    data = components.user('list');
  }
        
  // top-level links
  wstl.append({name:"homeLink",href:"/home/",
    rel:["home","collection"],root:root}, coll);
  wstl.append({name:"taskLink",href:"/task/",
    rel:["task","collection"],root:root},coll); 
  wstl.append({name:"userLink",href:"/user/",
    rel:["self","user","collection"],root:root},coll);
  wstl.append({name:"noteLink",href:"/note/",
    rel:["collection","/rels/note"],root:root},coll);
  wstl.append({name:"userProfile",href:"/files/user.profile",
    rel:["profile"],root:root},coll);

  // item actions
  wstl.append({name:"userLinkItem",href:"/user/{id}",
    rel:["item"],root:root},coll);
  wstl.append({name:"userLinkEdit",href:"/user/update/{id}",
    rel:["edit"],root:root},coll);
  wstl.append({name:"userLinkChangePW",href:"/user/pass/{id}",
    rel:["changePW","edit"],root:root},coll);
  wstl.append({name:"userTasksLink",href:"/task/?assignedUser={id}",
    rel:["tasksByUser","collection"],root:root},coll);
  
  // add template
  wstl.append({name: "userFormAdd",href:"/user/",
    rel:["create-form","userAdd","create-form"],root:root},coll);

  // list queries
  wstl.append({name:"userFormListByNick",href:"/user/",
    rel:["usersByNick","search"],root:root},coll);
  wstl.append({name:"userFormListByName",href:"/user/",
    rel:["usersByName","search"],root:root},coll);
  wstl.append({name:"userFormListByEmail",href:"/user/",
    rel:["usersByEmail","search"],root:root},coll);

  // compose and send graph 
  doc = {};
  doc.title = "TPS - Users";
  doc.actions = coll;
  doc.data =  data;
  doc.content = content;
  respond(req, res, {code:200, doc:{user:doc}});
}

function sendItemPage(req, res, respond, id) {
  var item, doc, coll, root;
  
  root = '//'+req.headers.host;
  coll = [];
  data = [];
  
  // load data item
  item = components.user('read',id);
  if(item.length===0) {
    respond(req, res, utils.errorResponse(req, res, "File Not Found", 404));
  }
  else {
    data = item;

    // top-level links
    wstl.append({name:"homeLink",href:"/home/",
      rel:["home","collection"],root:root}, coll);
    wstl.append({name:"taskLink",href:"/task/",
      rel:["task","collection"],root:root},coll); 
    wstl.append({name:"userLink",href:"/user/",
      rel:["collection","user"],root:root},coll);
    wstl.append({name:"noteLink",href:"/note/",
      rel:["collection","/rels/note"],root:root},coll);
    wstl.append({name:"userProfile",href:"/files/user.profile",
      rel:["profile"],root:root},coll);
    
    // item actions
    wstl.append({name:"userLinkItem",href:"/user/{id}",
      rel:["item"],root:root},coll);
    wstl.append({name:"userLinkEdit",href:"/user/update/{id}",
      rel:["edit"],root:root},coll);
    wstl.append({name:"userLinkChangePW",href:"/user/pass/{id}",
      rel:["changepw","edit"],root:root},coll);
    wstl.append({name:"userTasksLink",href:"/task/?assignedUser={id}",
      rel:["tasksByUser","collection"],root:root},coll);

    // list queries
    wstl.append({name:"userFormListByNick",href:"/user/",
      rel:["usersByNick","search"],root:root},coll);
    wstl.append({name:"userFormListByName",href:"/user/",
      rel:["usersByName","search"],root:root},coll);
    wstl.append({name:"userFormListByEmail",href:"/user/",
      rel:["usersByEmail","search"],root:root},coll);
        
    // compose and send graph 
    doc = {};
    doc.title = "TPS - Users";
    doc.actions = coll;
    doc.data =  data;
    doc.content = content;
    respond(req, res, {code:200, doc:{user:doc}});        
  }
}

function sendUpdatePage(req, res, respond, id) {
  var item, doc, coll, root;
  
  root = '//'+req.headers.host;
  coll = [];
  data = [];
  
  // load data item
  item = components.user('read',id);
  if(item.length===0) {
    respond(req, res, utils.errorResponse(req, res, "File Not Found", 404));
  }
  else {
    data = item;

    // top-level links
    wstl.append({name:"homeLink",href:"/home/",
      rel:["home","collection"],root:root}, coll);
    wstl.append({name:"taskLink",href:"/task/",
      rel:["task","collection"],root:root},coll); 
    wstl.append({name:"userLink",href:"/user/",
      rel:["collection","user"],root:root},coll);
    wstl.append({name:"noteLink",href:"/note/",
      rel:["collection","/rels/note"],root:root},coll);
    wstl.append({name:"userProfile",href:"/files/user.profile",
      rel:["profile"],root:root},coll);
    
    // item actions
    wstl.append({name:"userLinkItem",href:"/user/{id}",
      rel:["item"],root:root},coll);
    wstl.append({name:"userLinkEdit",href:"/user/update/{id}",
      rel:["edit"],root:root},coll);
    wstl.append({name:"userLinkChangePW",href:"/user/pass/{id}",
      rel:["changepw","edit"],root:root},coll);
    wstl.append({name:"userTasksLink",href:"/task/?assignedUser={id}",
      rel:["tasksByUser","collection"],root:root},coll);
    
    // item forms
    tran = wstl.append({name:"userFormEditPost",href:"/user/update/{id}",
      rel:["post-changePW","edit-form"],root:root},coll);

    // list queries
    wstl.append({name:"userFormListByNick",href:"/user/",
      rel:["usersByNick","search"],root:root},coll);
    wstl.append({name:"userFormListByName",href:"/user/",
      rel:["usersByName","search"],root:root},coll);
    wstl.append({name:"userFormListByEmail",href:"/user/",
      rel:["usersByEmail","search"],root:root},coll);

    // compose and send graph 
    doc = {};
    doc.title = "TPS - Users";
    doc.actions = coll;
    doc.data =  data;
    doc.content = content;

    respond(req, res, {code:200, doc:{user:doc}});        
  }
}

function sendPasswordPage(req, res, respond, id) {
  var item, doc, coll, root;
  
  root = '//'+req.headers.host;
  coll = [];
  data = [];
  
  // load data item
  item = components.user('read',id);
  if(item.length===0) {
    respond(req, res, utils.errorResponse(req, res, "File Not Found", 404));
  }
  else {
    data = item;

    // top-level links
    wstl.append({name:"homeLink",href:"/home/",
      rel:["home","collection"],root:root}, coll);
    wstl.append({name:"taskLink",href:"/task/",
      rel:["task","collection"],root:root},coll); 
    wstl.append({name:"userLink",href:"/user/",
      rel:["collection","user"],root:root},coll);
    wstl.append({name:"noteLink",href:"/note/",
      rel:["collection","/rels/note"],root:root},coll);
    wstl.append({name:"userProfile",href:"/files/user.profile",
      rel:["profile"],root:root},coll);
    
    // item actions
    wstl.append({name:"userLinkItem",href:"/user/{id}",
      rel:["item"],root:root},coll);
    wstl.append({name:"userLinkEdit",href:"/user/update/{id}",
      rel:["edit"],root:root},coll);
    wstl.append({name:"userLinkChangePW",href:"/user/pass/{id}",
      rel:["changepw","edit"],root:root},coll);
    wstl.append({name:"userTasksLink",href:"/task/?assignedUser={id}",
      rel:["tasksByUser","collection"],root:root},coll);
    
    // item forms
    tran = wstl.append({name:"userFormChangePWPost",href:"/user/pass/{id}",
      rel:["post-changePW","edit-form"],root:root},coll);

    // list queries
    wstl.append({name:"userFormListByNick",href:"/user/",
      rel:["usersByNick","search"],root:root},coll);
    wstl.append({name:"userFormListByName",href:"/user/",
      rel:["usersByName","search"],root:root},coll);
    wstl.append({name:"userFormListByEmail",href:"/user/",
      rel:["usersByEmail","search"],root:root},coll);

    // compose and send graph 
    doc = {};
    doc.title = "TPS - Users";
    doc.actions = coll;
    doc.data =  data;
    doc.content = content;
    respond(req, res, {code:200, doc:{user:doc}});        
  }
}

// handle add user 
function addUserItem(req, res, respond) {
  var body, doc, msg;

  body = '';
  
  // collect body
  req.on('data', function(chunk) {
    body += chunk;
  });

  // process body
  req.on('end', function() {
    try {
      msg = utils.parseBody(body, req.headers["content-type"]);
      if(!msg.nick || msg.nick===null || msg.nick==="") {
        doc = utils.errorResponse(req, res, "Missing Nick", 400);
      }
      if(!doc) {
        doc = components.user('add', msg, msg.nick);
        if(doc && doc.type==='error') {
          doc = utils.errorResponse(req, res, doc.message, doc.code);
        }
      }
    } 
    catch (ex) {
      doc = utils.errorResponse(req, res, 'Server Error', 500);
    }

    if (!doc) {
      respond(req, res, {code:303, doc:"", 
        headers:{'location':'//'+req.headers.host+"/user/"}
      });
    } 
    else {
      respond(req, res, doc);
    }
  });
}


// handle update user
function updateUser(req, res, respond, id) {
  var body, doc, msg;

  body = '';
  
  // collect body
  req.on('data', function(chunk) {
    body += chunk;
  });

  // process body
  req.on('end', function() {
    try {
      msg = utils.parseBody(body, req.headers["content-type"]);
      doc = components.user('update', id, msg);
      if(doc && doc.type==='error') {
        doc = utils.errorResponse(req, res, doc.message, doc.code);
      }
    } 
    catch (ex) {
      doc = utils.errorResponse(req, res, 'Server Error', 500);
    }

    if (!doc) {
      respond(req, res, 
        {code:303, doc:"", headers:{'location':'//'+req.headers.host+"/user/"}}
      );
    } 
    else {
      respond(req, res, doc);
    }
  })
}


//handle change password
function changePassword(req, res, respond, id) {
  var body, doc, msg;

  body = '';
  
  // collect body
  req.on('data', function(chunk) {
    body += chunk;
  });

  // process body
  req.on('end', function() {
    try {
      msg = utils.parseBody(body, req.headers["content-type"]);
      doc = components.user('change-password', id, msg);
      if(doc && doc.type==='error') {
        doc = utils.errorResponse(req, res, doc.message, doc.code);
      }
    } 
    catch (ex) {
      doc = utils.errorResponse(req, res, 'Server Error', 500);
    }

    if (!doc) {
      respond(req, res, 
        {code:303, doc:"", headers:{'location':'//'+req.headers.host+"/user/"}}
      );
    } 
    else {
      respond(req, res, doc);
    }
  })
}

// EOF

