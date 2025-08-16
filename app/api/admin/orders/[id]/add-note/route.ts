import { NextRequest } from "next/server";
import { requireAdminAPI } from "@/lib/auth/requireAdmin";
import { addOrderNote } from "@/lib/database/queries/orders";
import { createNextResponse } from "@/lib/validation/helpers";
import { z } from "zod";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AddNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(1000, "Note too long")
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const { user } = await requireAdminAPI();
    
    const { id: orderId } = await params;
    
    if (!orderId) {
      return createNextResponse({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Order ID is required',
        },
      }, 400);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = AddNoteSchema.safeParse(body);
    
    if (!validation.success) {
      return createNextResponse({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
        },
      }, 400);
    }

    const { note } = validation.data;

    // Add the note
    const result = await addOrderNote(orderId, user.id, note);
    
    if (!result.success) {
      return createNextResponse({
        success: false,
        error: {
          code: 'NOTE_FAILED',
          message: 'Failed to add note',
        },
      }, 500);
    }

    return createNextResponse({
      success: true,
      message: 'Note added successfully',
      data: {
        orderId,
        note,
        addedBy: user.email
      }
    });

  } catch (error) {
    console.error('Add note error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return createNextResponse({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }, 401);
      }
      
      if (error.message === 'FORBIDDEN') {
        return createNextResponse({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        }, 403);
      }
    }
    
    return createNextResponse({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to add note',
      },
    }, 500);
  }
}