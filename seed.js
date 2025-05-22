// seed.js - Place this file in your project root directory
// Make sure this is at the same level as your package.json
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Import models
import Domain from './src/models/domain.model.js';
import Technology from './src/models/technology.model.js';
import Tutorial from './src/models/tutorial.model.js';
import Lesson from './src/models/lesson.model.js';
import User from './src/models/user.model.js';
import slugify from 'slugify';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Lesson.deleteMany({});
    await Tutorial.deleteMany({});
    await Technology.deleteMany({});
    await Domain.deleteMany({});
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed domains
const seedDomains = async () => {
  const domains = [
    {
      name: 'Web Development',
      slug: slugify('Web Development', { lower: true, strict: true }),
      description: 'Learn to build websites and web applications using modern technologies',
      icon: 'code'
    },
    {
      name: 'Mobile Development',
      slug: slugify('Mobile Development', { lower: true, strict: true }),
      description: 'Create mobile applications for iOS and Android platforms',
      icon: 'smartphone'
    },
    {
      name: 'Data Science',
      slug: slugify('Data Science', { lower: true, strict: true }),
      description: 'Analyze data and build machine learning models',
      icon: 'bar-chart'
    },
    {
      name: 'DevOps & Cloud',
      slug: slugify('DevOps & Cloud', { lower: true, strict: true }),
      description: 'Learn deployment, infrastructure, and cloud technologies',
      icon: 'cloud'
    },
    {
      name: 'Programming Fundamentals',
      slug: slugify('Programming Fundamentals', { lower: true, strict: true }),
      description: 'Master the basics of programming and computer science',
      icon: 'book'
    }
  ];

  const createdDomains = await Domain.insertMany(domains);
  console.log('✅ Domains seeded');
  return createdDomains;
};

// Seed technologies
const seedTechnologies = async (domains) => {
  const webDev = domains.find(d => d.name === 'Web Development');
  const mobile = domains.find(d => d.name === 'Mobile Development');
  const dataScience = domains.find(d => d.name === 'Data Science');
  const devops = domains.find(d => d.name === 'DevOps & Cloud');
  const fundamentals = domains.find(d => d.name === 'Programming Fundamentals');

  const technologies = [
    // Web Development
    {
      name: 'HTML',
      slug: slugify('HTML', { lower: true, strict: true }),
      description: 'HyperText Markup Language - the foundation of web pages',
      domain: webDev._id,
      icon: 'code'
    },
    {
      name: 'CSS',
      slug: slugify('CSS', { lower: true, strict: true }),
      description: 'Cascading Style Sheets - styling and layout for web pages',
      domain: webDev._id,
      icon: 'palette'
    },
    {
      name: 'JavaScript',
      slug: slugify('JavaScript', { lower: true, strict: true }),
      description: 'Dynamic programming language for web interactivity',
      domain: webDev._id,
      icon: 'zap'
    },
    {
      name: 'React',
      slug: slugify('React', { lower: true, strict: true }),
      description: 'Popular JavaScript library for building user interfaces',
      domain: webDev._id,
      icon: 'react'
    },
    {
      name: 'Node.js',
      slug: slugify('Node.js', { lower: true, strict: true }),
      description: 'JavaScript runtime for server-side development',
      domain: webDev._id,
      icon: 'server'
    },
    {
      name: 'Vue.js',
      slug: slugify('Vue.js', { lower: true, strict: true }),
      description: 'Progressive JavaScript framework for building UIs',
      domain: webDev._id,
      icon: 'vue'
    },
    // Mobile Development
    {
      name: 'React Native',
      slug: slugify('React Native', { lower: true, strict: true }),
      description: 'Build mobile apps using React and JavaScript',
      domain: mobile._id,
      icon: 'smartphone'
    },
    {
      name: 'Flutter',
      slug: slugify('Flutter', { lower: true, strict: true }),
      description: 'Google\'s UI toolkit for building cross-platform mobile apps',
      domain: mobile._id,
      icon: 'smartphone'
    },
    {
      name: 'Swift',
      slug: slugify('Swift', { lower: true, strict: true }),
      description: 'Apple\'s programming language for iOS development',
      domain: mobile._id,
      icon: 'apple'
    },
    // Data Science
    {
      name: 'Python',
      slug: slugify('Python', { lower: true, strict: true }),
      description: 'Versatile programming language popular in data science',
      domain: dataScience._id,
      icon: 'python'
    },
    {
      name: 'SQL',
      slug: slugify('SQL', { lower: true, strict: true }),
      description: 'Structured Query Language for database management',
      domain: dataScience._id,
      icon: 'database'
    },
    // DevOps
    {
      name: 'Docker',
      slug: slugify('Docker', { lower: true, strict: true }),
      description: 'Containerization platform for application deployment',
      domain: devops._id,
      icon: 'container'
    },
    {
      name: 'AWS',
      slug: slugify('AWS', { lower: true, strict: true }),
      description: 'Amazon Web Services cloud computing platform',
      domain: devops._id,
      icon: 'cloud'
    },
    // Programming Fundamentals
    {
      name: 'Algorithms',
      slug: slugify('Algorithms', { lower: true, strict: true }),
      description: 'Learn fundamental algorithms and data structures',
      domain: fundamentals._id,
      icon: 'cpu'
    }
  ];

  const createdTechnologies = await Technology.insertMany(technologies);
  console.log('✅ Technologies seeded');
  return createdTechnologies;
};

// Seed users
const seedUsers = async () => {
  const users = [
    {
      username: 'admin',
      email: 'admin@codecraft.com',
      password: 'admin123',
      role: 'admin',
      bio: 'CodeCraft administrator and lead instructor',
      location: 'San Francisco, CA',
      websiteUrl: 'https://codecraft.com'
    },
    {
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user',
      bio: 'Full-stack developer passionate about React and Node.js',
      location: 'New York, NY',
      websiteUrl: 'https://johndoe.dev'
    },
    {
      username: 'sarahsmith',
      email: 'sarah@example.com',
      password: 'password123',
      role: 'user',
      bio: 'Frontend developer specializing in modern JavaScript frameworks',
      location: 'Austin, TX',
      websiteUrl: 'https://sarahsmith.dev'
    }
  ];

  const createdUsers = await User.insertMany(users);
  console.log('✅ Users seeded');
  return createdUsers;
};

// Seed tutorials
const seedTutorials = async (domains, technologies, users) => {
  const webDev = domains.find(d => d.name === 'Web Development');
  const fundamentals = domains.find(d => d.name === 'Programming Fundamentals');
  const dataScience = domains.find(d => d.name === 'Data Science');
  
  const html = technologies.find(t => t.name === 'HTML');
  const css = technologies.find(t => t.name === 'CSS');
  const javascript = technologies.find(t => t.name === 'JavaScript');
  const react = technologies.find(t => t.name === 'React');
  const nodejs = technologies.find(t => t.name === 'Node.js');
  const python = technologies.find(t => t.name === 'Python');
  
  const admin = users.find(u => u.role === 'admin');

  const tutorials = [
    {
      title: 'HTML Fundamentals for Beginners',
      slug: slugify('HTML Fundamentals for Beginners', { lower: true, strict: true }),
      description: 'Learn the basics of HTML including elements, attributes, and document structure. Perfect for complete beginners.',
      domain: webDev._id,
      technology: html._id,
      difficulty: 'beginner',
      author: admin._id,
      estimatedTime: 120,
      tags: ['html', 'web development', 'beginner', 'markup'],
      isPublished: true,
      publishedAt: new Date('2024-01-15')
    },
    {
      title: 'CSS Styling and Layout Mastery',
      slug: slugify('CSS Styling and Layout Mastery', { lower: true, strict: true }),
      description: 'Master CSS styling, layouts, flexbox, and grid to create beautiful responsive websites.',
      domain: webDev._id,
      technology: css._id,
      difficulty: 'intermediate',
      author: admin._id,
      estimatedTime: 180,
      tags: ['css', 'styling', 'layout', 'responsive', 'flexbox', 'grid'],
      isPublished: true,
      publishedAt: new Date('2024-01-20')
    },
    {
      title: 'JavaScript Essential Concepts',
      slug: slugify('JavaScript Essential Concepts', { lower: true, strict: true }),
      description: 'Learn JavaScript fundamentals including variables, functions, objects, and DOM manipulation.',
      domain: webDev._id,
      technology: javascript._id,
      difficulty: 'beginner',
      author: admin._id,
      estimatedTime: 240,
      tags: ['javascript', 'programming', 'dom', 'functions'],
      isPublished: true,
      publishedAt: new Date('2024-02-01')
    },
    {
      title: 'Advanced JavaScript and ES6+',
      slug: slugify('Advanced JavaScript and ES6+', { lower: true, strict: true }),
      description: 'Deep dive into modern JavaScript features, async programming, and advanced concepts.',
      domain: webDev._id,
      technology: javascript._id,
      difficulty: 'advanced',
      author: admin._id,
      estimatedTime: 300,
      tags: ['javascript', 'es6', 'async', 'advanced', 'promises'],
      isPublished: true,
      publishedAt: new Date('2024-02-15')
    },
    {
      title: 'React Components and State Management',
      slug: slugify('React Components and State Management', { lower: true, strict: true }),
      description: 'Build dynamic React applications with components, hooks, and state management.',
      domain: webDev._id,
      technology: react._id,
      difficulty: 'intermediate',
      author: admin._id,
      estimatedTime: 360,
      tags: ['react', 'components', 'hooks', 'state', 'jsx'],
      isPublished: true,
      publishedAt: new Date('2024-03-01')
    },
    {
      title: 'Node.js Backend Development',
      slug: slugify('Node.js Backend Development', { lower: true, strict: true }),
      description: 'Create REST APIs and server-side applications with Node.js and Express.',
      domain: webDev._id,
      technology: nodejs._id,
      difficulty: 'intermediate',
      author: admin._id,
      estimatedTime: 420,
      tags: ['nodejs', 'express', 'api', 'backend', 'server'],
      isPublished: true,
      publishedAt: new Date('2024-03-15')
    },
    {
      title: 'Python Programming Basics',
      slug: slugify('Python Programming Basics', { lower: true, strict: true }),
      description: 'Learn Python syntax, data types, control structures, and object-oriented programming.',
      domain: dataScience._id,
      technology: python._id,
      difficulty: 'beginner',
      author: admin._id,
      estimatedTime: 300,
      tags: ['python', 'programming', 'basics', 'oop'],
      isPublished: true,
      publishedAt: new Date('2024-04-01')
    },
    {
      title: 'Building Your First Website',
      slug: slugify('Building Your First Website', { lower: true, strict: true }),
      description: 'Complete project-based tutorial to build a full website from scratch using HTML, CSS, and JavaScript.',
      domain: webDev._id,
      technology: html._id,
      difficulty: 'beginner',
      author: admin._id,
      estimatedTime: 480,
      tags: ['html', 'css', 'javascript', 'project', 'website'],
      isPublished: true,
      publishedAt: new Date('2024-04-15')
    }
  ];

  const createdTutorials = await Tutorial.insertMany(tutorials);
  console.log('✅ Tutorials seeded');
  return createdTutorials;
};

// Seed lessons
const seedLessons = async (tutorials) => {
  const lessons = [];

  // HTML Fundamentals lessons
  const htmlTutorial = tutorials.find(t => t.title === 'HTML Fundamentals for Beginners');
  if (htmlTutorial) {
    lessons.push(
      {
        title: 'Introduction to HTML',
        slug: slugify('Introduction to HTML', { lower: true, strict: true }),
        order: 1,
        tutorial: htmlTutorial._id,
        duration: 15,
        content: [
          {
            type: 'text',
            data: {
              text: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page using elements and tags.\n\nIn this lesson, you\'ll learn what HTML is, why it\'s important, and how it works with other web technologies.'
            }
          },
          {
            type: 'code',
            data: {
              code: '<!DOCTYPE html>\n<html>\n<head>\n    <title>My First Web Page</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n    <p>This is my first HTML page.</p>\n</body>\n</html>',
              language: 'html',
              caption: 'Basic HTML document structure'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-01-15')
      },
      {
        title: 'HTML Elements and Tags',
        slug: slugify('HTML Elements and Tags', { lower: true, strict: true }),
        order: 2,
        tutorial: htmlTutorial._id,
        duration: 20,
        content: [
          {
            type: 'text',
            data: {
              text: 'HTML elements are the building blocks of web pages. Each element is defined by tags that tell the browser how to structure and display content.'
            }
          },
          {
            type: 'code',
            data: {
              code: '<h1>This is a heading</h1>\n<p>This is a paragraph</p>\n<a href="https://example.com">This is a link</a>\n<img src="image.jpg" alt="Description">',
              language: 'html',
              caption: 'Common HTML elements'
            }
          },
          {
            type: 'quiz',
            data: {
              question: 'Which HTML element is used for the largest heading?',
              options: ['<h6>', '<h1>', '<heading>', '<title>'],
              correctAnswer: 1
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-01-15')
      },
      {
        title: 'HTML Attributes',
        slug: slugify('HTML Attributes', { lower: true, strict: true }),
        order: 3,
        tutorial: htmlTutorial._id,
        duration: 18,
        content: [
          {
            type: 'text',
            data: {
              text: 'HTML attributes provide additional information about elements. They are always specified in the opening tag and come in name/value pairs.'
            }
          },
          {
            type: 'code',
            data: {
              code: '<a href="https://example.com" target="_blank">External Link</a>\n<img src="photo.jpg" alt="A beautiful sunset" width="300">\n<div class="container" id="main-content">Content here</div>',
              language: 'html',
              caption: 'HTML attributes in action'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-01-15')
      }
    );
  }

  // CSS Tutorial lessons
  const cssTutorial = tutorials.find(t => t.title === 'CSS Styling and Layout Mastery');
  if (cssTutorial) {
    lessons.push(
      {
        title: 'CSS Basics and Selectors',
        slug: slugify('CSS Basics and Selectors', { lower: true, strict: true }),
        order: 1,
        tutorial: cssTutorial._id,
        duration: 25,
        content: [
          {
            type: 'text',
            data: {
              text: 'CSS (Cascading Style Sheets) is used to style and layout web pages. CSS selectors are patterns used to select the elements you want to style.'
            }
          },
          {
            type: 'code',
            data: {
              code: '/* Element selector */\np {\n    color: blue;\n    font-size: 16px;\n}\n\n/* Class selector */\n.highlight {\n    background-color: yellow;\n}\n\n/* ID selector */\n#header {\n    font-size: 24px;\n    font-weight: bold;\n}',
              language: 'css',
              caption: 'CSS selectors and properties'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-01-20')
      },
      {
        title: 'Flexbox Layout',
        slug: slugify('Flexbox Layout', { lower: true, strict: true }),
        order: 2,
        tutorial: cssTutorial._id,
        duration: 30,
        content: [
          {
            type: 'text',
            data: {
              text: 'Flexbox is a powerful layout method that makes it easy to arrange elements in rows or columns, distribute space, and align items.'
            }
          },
          {
            type: 'code',
            data: {
              code: '.container {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    gap: 20px;\n}\n\n.item {\n    flex: 1;\n    padding: 10px;\n    background-color: #f0f0f0;\n}',
              language: 'css',
              caption: 'Flexbox container and items'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-01-20')
      }
    );
  }

  // JavaScript Tutorial lessons
  const jsTutorial = tutorials.find(t => t.title === 'JavaScript Essential Concepts');
  if (jsTutorial) {
    lessons.push(
      {
        title: 'Variables and Data Types',
        slug: slugify('Variables and Data Types', { lower: true, strict: true }),
        order: 1,
        tutorial: jsTutorial._id,
        duration: 20,
        content: [
          {
            type: 'text',
            data: {
              text: 'JavaScript variables are containers for storing data values. JavaScript has several data types including strings, numbers, booleans, objects, and arrays.'
            }
          },
          {
            type: 'code',
            data: {
              code: '// Variable declarations\nlet name = "John Doe";\nconst age = 25;\nvar isStudent = true;\n\n// Different data types\nlet message = "Hello, World!"; // string\nlet count = 42; // number\nlet isActive = false; // boolean\nlet user = { name: "Alice", age: 30 }; // object\nlet colors = ["red", "green", "blue"]; // array',
              language: 'javascript',
              caption: 'JavaScript variables and data types'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-02-01')
      },
      {
        title: 'Functions and Scope',
        slug: slugify('Functions and Scope', { lower: true, strict: true }),
        order: 2,
        tutorial: jsTutorial._id,
        duration: 25,
        content: [
          {
            type: 'text',
            data: {
              text: 'Functions are reusable blocks of code that perform specific tasks. Understanding scope helps you control where variables can be accessed in your code.'
            }
          },
          {
            type: 'code',
            data: {
              code: '// Function declaration\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}\n\n// Arrow function\nconst multiply = (a, b) => a * b;\n\n// Function with local scope\nfunction calculate() {\n    let result = 10; // local variable\n    return result * 2;\n}\n\nconsole.log(greet("Alice")); // "Hello, Alice!"\nconsole.log(multiply(5, 3)); // 15',
              language: 'javascript',
              caption: 'JavaScript functions'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-02-01')
      }
    );
  }

  // React Tutorial lessons
  const reactTutorial = tutorials.find(t => t.title === 'React Components and State Management');
  if (reactTutorial) {
    lessons.push(
      {
        title: 'Your First React Component',
        slug: slugify('Your First React Component', { lower: true, strict: true }),
        order: 1,
        tutorial: reactTutorial._id,
        duration: 20,
        content: [
          {
            type: 'text',
            data: {
              text: 'React components are the building blocks of React applications. They are JavaScript functions that return JSX to describe what should appear on the screen.'
            }
          },
          {
            type: 'code',
            data: {
              code: 'import React from \'react\';\n\n// Functional component\nfunction Welcome(props) {\n    return <h1>Hello, {props.name}!</h1>;\n}\n\n// Arrow function component\nconst Greeting = ({ message }) => {\n    return (\n        <div>\n            <h2>Welcome!</h2>\n            <p>{message}</p>\n        </div>\n    );\n};\n\nexport default Welcome;',
              language: 'javascript',
              caption: 'React functional components'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-03-01')
      },
      {
        title: 'useState Hook',
        slug: slugify('useState Hook', { lower: true, strict: true }),
        order: 2,
        tutorial: reactTutorial._id,
        duration: 25,
        content: [
          {
            type: 'text',
            data: {
              text: 'The useState hook lets you add state to functional components. State allows components to remember information and update the UI when data changes.'
            }
          },
          {
            type: 'code',
            data: {
              code: 'import React, { useState } from \'react\';\n\nfunction Counter() {\n    const [count, setCount] = useState(0);\n\n    const increment = () => {\n        setCount(count + 1);\n    };\n\n    return (\n        <div>\n            <p>Count: {count}</p>\n            <button onClick={increment}>\n                Increment\n            </button>\n        </div>\n    );\n}\n\nexport default Counter;',
              language: 'javascript',
              caption: 'Using useState hook'
            }
          }
        ],
        isPublished: true,
        publishedAt: new Date('2024-03-01')
      }
    );
  }

  const createdLessons = await Lesson.insertMany(lessons);
  console.log('✅ Lessons seeded');
  return createdLessons;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');
    
    await connectDB();
    await clearDatabase();
    
    const domains = await seedDomains();
    const technologies = await seedTechnologies(domains);
    const users = await seedUsers();
    const tutorials = await seedTutorials(domains, technologies, users);
    const lessons = await seedLessons(tutorials);
    
    console.log('\n🎉 Database seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • ${domains.length} domains`);
    console.log(`   • ${technologies.length} technologies`);
    console.log(`   • ${users.length} users`);
    console.log(`   • ${tutorials.length} tutorials`);
    console.log(`   • ${lessons.length} lessons`);
    
    console.log('\n👤 Test accounts:');
    console.log('   Admin: admin@codecraft.com / admin123');
    console.log('   User: john@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed
seedDatabase();