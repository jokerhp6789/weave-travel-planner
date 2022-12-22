const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Trip = mongoose.model("Trip");
const { requireUser } = require("../../config/passport");
const sendEmail = require("../../Email");

//TRIP INDEX
router.get("/", async function (req, res, next) {
  let trips;
  try {
    trips = await Trip.find();
  } catch (err) {
    const error = new Error("Trip not found");
    error.statusCode = 404;
    error.errors = { message: "No Trip found with that id" };
    return next(error);
  }
  return res.json({ trips: trips });
});

//USER TRIP INDEX
router.get("/users/:userId", async function (req, res, next) {
  let trips;
  let userTrips;
  try {
    trips = await Trip.find();
    userTrips = trips.filter((trip) => {
      return trip.owner == req.params.userId;
    });
  } catch (err) {
    const error = new Error("Trip not found");
    error.statusCode = 404;
    error.errors = { message: "No Trip found with that id" };
    return next(error);
  }
  return res.json({ trips: userTrips });
});

//TRIP SHOW
router.get("/:tripId", async function (req, res, next) {
  let trip;
  try {
    trip = await Trip.findById(req.params.tripId);
  } catch (err) {
    const error = new Error("Trip not found");
    error.statusCode = 404;
    error.errors = { message: "No Trip found with that id" };
    return next(error);
  }
  return res.json({ trip: trip });
});

//TRIP CREATE
router.post("/", requireUser, async function (req, res, next) {
  try {
    const startDateObj = new Date(req.body.trip.startDate);
    const endDateObj = new Date(req.body.trip.endDate);

    const newTrip = new Trip({
      owner: req.user._id,
      startDate: startDateObj,
      endDate: endDateObj,
      startDate: req.body.trip.startDate,
      endDate: req.body.trip.endDate,
      name: req.body.trip.name,
      description: req.body.trip.description,
    });

    let trip = await newTrip.save();
    return res.json(trip);
  } catch (err) {
    next(err);
  }
});

//TRIP ADD MULTIPLE MEMBERS
router.post("/:tripId/invite", requireUser, async function (req, res, next) {
  let users = req.body.members;
  let weaveUsers = [];
  let newTripMembers = [];
  let checkUser;
  let trip = await Trip.findById(req.params.tripId);
  let tripOwner = await User.findById(trip.owner);
  let tripMemberEmails = [];

  //Filter emails that are not Weave Users
  
  for (let i = 0; i < users.length; i++) {
    checkUser = await User.findOne({
      $or: [{ email: req.body.members[i] }],
    });
    if (checkUser) {
      weaveUsers.push(checkUser);
    }
  }
  //Accumulate array of emails in Trip
  for (let i = 0; i < trip.members.length; i++) {
    tripMemberEmails.push(trip.members[i].email);
  }
  //Filter Weave Users that are not in Trip
  weaveUsers.forEach((user) => {
    if (!tripMemberEmails.includes(user.email)) {
      newTripMembers.push(user);
    }
  });
  //Send Email to new trip members
  let tripDetails;
  newTripMembers.forEach((newMember) => {
    tripDetails = {
      newMemberId: newMember._id,
      newMemberEmail: newMember.email,
      newMemberFirstName: newMember.firstName,
      ownerName: tripOwner.firstName,
      tripName: trip.name,
      tripId: trip._id,
    };
    sendEmail(tripDetails);
  });

  return res.json(`${newTripMembers.length} email invitations have sent`);
});

//TRIP INVITE MEMBER
// router.post("/:tripId/invite", requireUser, async function (req, res, next) {
//   let user;
//   let userInfo = {};
//   let trip;
//   try {
//     trip = await Trip.findById(req.params.tripId);
//     const email = req.body.email;
//     invitedUser = await User.findOne({
//       $or: [{ email: req.body.email }],
//     });
//     userInfo._id = invitedUser._id;
//     userInfo.firstName = invitedUser.firstName;
//     userInfo.lastName = invitedUser.lastName;
//     userInfo.email = invitedUser.email;
//     userInfo.trips = invitedUser.trips;
//     userInfo.owner = req.user.firstName;
//     userInfo.tripName = trip.name;
//     userInfo.tripId = trip._id;
//     userInfo.tripInfo = trip;
//   } catch (err) {
//     next(err);
//   }
//   const tripDetails = {
//     invitedUserId: userInfo._id,
//     invitedUserEmail: userInfo.email,
//     invitedUserName: userInfo.firstName,
//     ownerName: userInfo.owner,
//     tripName: userInfo.tripId,
//     tripId: userInfo.tripInfo._id,
//   };
//   sendEmail(tripDetails);
//   return res.json(userInfo);
// });

//TRIP UPDATE
router.patch("/:tripId", requireUser, async function (req, res, next) {
  let trip;
  try {
    trip = await Trip.findById(req.params.tripId);

    const startDateObj = new Date(req.body.startDate);
    const endDateObj = new Date(req.body.endDate);

    trip.owner = req.user._id;
    trip.startDate = startDateObj;
    trip.endDate = endDateObj;
    trip.name = req.body.name;
    trip.locations = req.body.locations;
    trip.members = req.body.members;
    trip.save();
  } catch (err) {
    next(err);
  }
  return res.json(trip);
});

//TRIP DELETE
router.delete("/:tripId", requireUser, async function (req, res, next) {
  try {
    let trip = await Trip.findById(req.params.tripId);
    trip.delete();
    return res.send("trip has been successfully deleted");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
