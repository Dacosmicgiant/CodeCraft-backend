import mongoose from 'mongoose';
import slugify from 'slugify';

const domainSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Domain name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  icon: {
    type: String,
    default: 'folder'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for technologies
domainSchema.virtual('technologies', {
  ref: 'Technology',
  localField: '_id',
  foreignField: 'domain'
});

// Create slug before saving
domainSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;