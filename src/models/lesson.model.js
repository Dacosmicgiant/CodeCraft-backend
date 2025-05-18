import mongoose from 'mongoose';
import slugify from 'slugify';

// Content block schema
const contentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'code', 'image', 'video', 'quiz'],
    required: true
  },
  data: {
    text: String,
    code: String,
    language: String,
    url: String,
    alt: String,
    caption: String,
    question: String,
    options: [String],
    correctAnswer: Number
  }
}, { _id: true });

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  slug: {
    type: String
  },
  order: {
    type: Number,
    required: [true, 'Order is required']
  },
  tutorial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutorial',
    required: [true, 'Tutorial is required']
  },
  content: [contentBlockSchema],
  duration: {
    type: Number,  // in minutes
    default: 10
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create slug before saving
lessonSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;