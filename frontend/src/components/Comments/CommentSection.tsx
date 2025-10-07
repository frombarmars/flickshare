import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    profilePicture?: string;
  };
  replies: Comment[];
}

interface CommentSectionProps {
  reviewId: string;
}

export const CommentSection = ({ reviewId }: CommentSectionProps) => {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/comments?reviewId=${reviewId}`);
        if (!res.ok) throw new Error('Failed to fetch comments');
        const data = await res.json();
        setComments(data.comments);
      } catch (error) {
        console.error(error);
      }
    };

    if (reviewId) {
      fetchComments();
    }
  }, [reviewId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId, content: newComment }),
      });

      if (!res.ok) throw new Error('Failed to post comment');

      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <h3 className="text-lg font-bold text-black mb-3">Comments</h3>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-3">
            <Image
              src={comment.author.profilePicture || '/placeholder.jpeg'}
              alt={comment.author.username}
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">{comment.author.username}</p>
              <p className="text-sm text-gray-700">{comment.content}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      {session && (
        <div className="mt-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full h-20 p-2 border rounded-md bg-gray-50"
            placeholder="Add a comment..."
          />
          <button
            onClick={handlePostComment}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Post Comment
          </button>
        </div>
      )}
    </div>
  );
};