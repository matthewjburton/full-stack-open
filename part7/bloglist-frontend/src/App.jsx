import { useState, useEffect, useRef } from 'react'
import Blog from './components/Blog'
import blogService from './services/blogs'
import loginService from './services/login'
import Notification from './components/Notification'
import Togglable from './components/Togglable'
import BlogForm from './components/BlogForm'
import blogsService from './services/blogs'
import { notifyWithTimeout } from './reducers/notificationReducer'
import { useDispatch } from 'react-redux'

const App = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)

  const [blogs, setBlogs] = useState([])
  const blogFormRef = useRef()

  const dispatch = useDispatch()

  useEffect(() => {
    blogService.getAll().then((blogs) => {
      setBlogs(blogs)
    })
  }, [])

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBlogappUser')
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON)
      setUser(user)
      blogService.setToken(user.token)
    }
  }, [])

  const handleLogin = async (event) => {
    event.preventDefault()

    try {
      const user = await loginService.login({
        username,
        password,
      })

      window.localStorage.setItem('loggedBlogappUser', JSON.stringify(user))
      blogService.setToken(user.token)
      setUser(user)
      setUsername('')
      setPassword('')

      dispatch(notifyWithTimeout('successfully logged in', 5))
    } catch (exception) {
      dispatch(notifyWithTimeout('wrong username or password', 5))
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem('loggedBlogappUser')
    setUser(null)

    dispatch(notifyWithTimeout('successfully logged out', 5))
  }

  const createBlog = async (newBlog) => {
    try {
      const createdBlog = await blogService.create(newBlog)

      blogFormRef.current.toggleVisibility()
      setBlogs(blogs.concat(createdBlog))

      dispatch(
        notifyWithTimeout(
          `a new blog ${createdBlog.title} by ${createdBlog.author} added`,
          5
        )
      )
    } catch (error) {
      console.log(error)
      dispatch(notifyWithTimeout('error adding blog', 5))
    }
  }

  const updateBlog = async (updatedBlog) => {
    const returnedBlog = await blogsService.update(updatedBlog.id, updatedBlog)

    // Update the blogs state with the updated blog post
    setBlogs(
      blogs.map((blog) => (blog.id !== updatedBlog.id ? blog : returnedBlog))
    )
  }

  const deleteBlog = async (blogToDelete) => {
    blogsService.deleteBlog(blogToDelete.id)
    setBlogs(blogs.filter((blog) => blog.id !== blogToDelete.id))
  }

  const sortByLikes = (blogOne, blogTwo) => {
    return blogTwo.likes - blogOne.likes
  }

  if (!user)
    return (
      <div>
        <h2>Log in to application</h2>

        <Notification />

        <form data-testid="LoginForm" onSubmit={handleLogin}>
          <div>
            <label htmlFor="username">username</label>
            <input
              type="text"
              value={username}
              name="Username"
              data-testid="username"
              onChange={({ target }) => setUsername(target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">password</label>
            <input
              type="password"
              value={password}
              name="Password"
              data-testid="password"
              onChange={({ target }) => setPassword(target.value)}
            />
          </div>
          <button type="submit">login</button>
        </form>
      </div>
    )

  return (
    <div>
      <h2>blogs</h2>

      <Notification />

      <div>
        {user.name} logged in
        <button onClick={handleLogout}>logout</button>
      </div>

      <br />

      <Togglable buttonLabel={'new blog'} ref={blogFormRef}>
        <BlogForm createBlog={(newBlog) => createBlog(newBlog)} />
      </Togglable>

      {blogs.sort(sortByLikes).map((blog) => (
        <Blog
          key={blog.id}
          blog={blog}
          updateBlog={(updatedBog) => updateBlog(updatedBog)}
          deleteBlog={(blogToDelete) => deleteBlog(blogToDelete)}
          user={user}
        />
      ))}
    </div>
  )
}

export default App