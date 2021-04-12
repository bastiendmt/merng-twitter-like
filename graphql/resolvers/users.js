const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const { validateRegisterInput, validateLoginInput } = require("../../utils/validators");
const User = require("../../models/User");
const { SECRET_KEY } = require("../../config");

const generateToken= (user) =>{
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
}

module.exports = {
  Mutation: {
    async register(
      _,
      { registerInput: { username, email, password, confirmPassword } }
    ) {
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError("Username is already taken", {
          error: {
            username: "This username is taken",
          },
        });
      }

      password = await bycrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      const token = generateToken(res)

      return {
        ...res._doc,
        id: res.id,
        token,
      };
    },

    async login(_, {username, password}) {
      const {errors, valid} = validateLoginInput(username, password)

      if(!valid) {
        throw new UserInputError('Login form not valid', {errors})
      }

      const user = await User.findOne({username})

      if(!user){
        errors.general = 'User not found'
        throw new UserInputError('User not found', {errors})
      }

      const match = await bycrypt.compare(password, user.password)
      if (!match) {
        errors.general = 'Wrong credentials'
        throw new UserInputError('Wrong credentials', {errors})
      }

      const token = generateToken(user)

      return {
        ...user._doc,
        id: user.id,
        token,
      };
    }
  },
};
