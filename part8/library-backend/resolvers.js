const { GraphQLError } = require('graphql')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const jwt = require('jsonwebtoken')

const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

const DataLoader = require('dataloader')

const resolvers = {
  Query: {
    me: (root, args, { currentUser }) => {
      return currentUser
    },
    bookCount: async () => {
      try {
        console.log('Book.collection')
        return await Book.collection.countDocuments()
      } catch (error) {
        throw new GraphQLError('Failed to fetch book count', {
          extensions: { code: 'BOOK_COUNT_FAILED', error },
        })
      }
    },
    authorCount: async () => {
      try {
        console.log('Author.collection')
        return await Author.collection.countDocuments()
      } catch (error) {
        throw new GraphQLError('Failed to fetch author count', {
          extensions: { code: 'AUTHOR_COUNT_FAILED', error },
        })
      }
    },
    allBooks: async (root, args) => {
      try {
        const filter = {}

        if (args.author) {
          console.log('Author.findOne')
          const author = await Author.findOne({ name: args.author })
          if (author) {
            filter.author = author._id
          } else {
            return []
          }
        }

        if (args.genre) {
          filter.genres = { $in: [args.genre] }
        }
        console.log('Book.find')
        return await Book.find(filter).populate('author')
      } catch (error) {
        throw new GraphQLError('Failed to fetch books', {
          extensions: { code: 'ALL_BOOKS_QUERY_FAILED', error },
        })
      }
    },
    allAuthors: async () => {
      try {
        console.log('Author.find')
        return await Author.find({})
      } catch (error) {
        throw new GraphQLError('Failed to fetch authors', {
          extensions: { code: 'ALL_AUTHORS_QUERY_FAILED', error },
        })
      }
    },
  },
  Author: {
    bookCount: async (root, args, context) => {
      return context.bookCountLoader.load(root._id)
    },
  },
  Mutation: {
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre, // Include favoriteGenre here
      })

      return user.save().catch((error) => {
        throw new GraphQLError('Creating the user failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error,
          },
        })
      })
    },
    login: async (root, args) => {
      console.log('User.findOne')
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secret') {
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        })
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
    addBook: async (root, args, { currentUser }) => {
      try {
        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          })
        }

        console.log('Author.findOne')
        let author = await Author.findOne({ name: args.author })

        if (!author) {
          author = new Author({
            name: args.author,
            born: null,
          })
          await author.save()
        }

        const book = new Book({
          title: args.title,
          published: args.published,
          author: author._id,
          genres: args.genres,
        })

        await book.save()

        pubsub.publish('BOOK_ADDED', {
          bookAdded: book.populate('author'),
        })

        return book.populate('author')
      } catch (error) {
        throw new GraphQLError('Failed to add book', {
          extensions: { code: 'ADD_BOOK_FAILED', error },
        })
      }
    },
    editAuthor: async (root, args, { currentUser }) => {
      try {
        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          })
        }

        const author = await Author.findOne({ name: args.name })

        if (!author) {
          throw new GraphQLError('Author not found', {
            extensions: { code: 'AUTHOR_NOT_FOUND' },
          })
        }

        author.born = args.setBornTo
        return await author.save()
      } catch (error) {
        throw new GraphQLError('Failed to edit author', {
          extensions: { code: 'EDIT_AUTHOR_FAILED', error },
        })
      }
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator('BOOK_ADDED'),
    },
  },
}

// Create a DataLoader to batch requests for book counts
const bookCountLoader = new DataLoader(async (authorIds) => {
  const books = await Book.aggregate([
    { $match: { author: { $in: authorIds } } },
    { $group: { _id: '$author', count: { $sum: 1 } } },
  ])

  const bookCountMap = {}
  books.forEach((book) => {
    bookCountMap[book._id] = book.count
  })

  return authorIds.map((id) => bookCountMap[id] || 0)
})

module.exports = { resolvers, bookCountLoader }
