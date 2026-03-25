const pool = require('../../config/db');

class ApprovalWorkflow {
    /**
     * Start the approval process for a new Purchase Order
     */
    static async initiateApproval(purchaseOrderId, hospitalId, totalAmount, departmentId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Find all applicable rules for this department and amount
            const matrixRes = await client.query(
                `SELECT * FROM approval_matrices 
                 WHERE department_id = $1 AND min_amount <= $2
                 ORDER BY min_amount ASC`,
                [departmentId, totalAmount]
            );

            let initialStatus = 'APPROVED';
            let nextApproverRole = null;

            if (matrixRes.rows.length > 0) {
                // It requires approval. Determine the first stage.
                initialStatus = 'PENDING_L1';
                nextApproverRole = matrixRes.rows[0].required_role;
                
                // Update PO status to reflect it's pending approval
                await client.query(
                    `UPDATE purchase_orders SET approval_stage = 1, status = $1 WHERE id = $2 AND hospital_id = $3`,
                    [initialStatus, purchaseOrderId, hospitalId]
                );

                // Find the user holding this role to notify them
                const userRes = await client.query(
                    `SELECT id, is_on_leave, delegated_to_user_id FROM users WHERE role = $1 AND hospital_id = $2 LIMIT 1`,
                    [nextApproverRole, hospitalId]
                );

                if (userRes.rows.length > 0) {
                    let targetUserId = userRes.rows[0].id;
                    
                    // [ENTERPRISE] Delegation Logic
                    if (userRes.rows[0].is_on_leave && userRes.rows[0].delegated_to_user_id) {
                        targetUserId = userRes.rows[0].delegated_to_user_id;
                        console.log(`[ApprovalWorkflow] Approver ${userRes.rows[0].id} is on leave. Delegating PO #${purchaseOrderId} to User ${targetUserId}.`);
                    }

                    // Trigger Push Notification Mock
                    this.sendPushNotification(targetUserId, `PO #${purchaseOrderId} requires your approval. Amount: ${totalAmount}`);
                }
            } else {
                // Auto-approve if no matrix rule applies (e.g. very small amount)
                await client.query(
                    `UPDATE purchase_orders SET status = 'APPROVED', approved_by = -1 WHERE id = $1 AND hospital_id = $2`,
                    [purchaseOrderId, hospitalId]
                );
            }

            await client.query('COMMIT');
            return { status: initialStatus };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[ApprovalWorkflow] Init Error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Process an approval action from a user
     */
    static async processAction(purchaseOrderId, hospitalId, userId, action, reason = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current PO state
            const poRes = await client.query(
                `SELECT total_amount, approval_stage, status, required_department_id 
                 FROM purchase_orders WHERE id = $1 AND hospital_id = $2`,
                [purchaseOrderId, hospitalId]
            );

            if (poRes.rows.length === 0) throw new Error('PO not found');
            const po = poRes.rows[0];

            if (po.status === 'APPROVED' || po.status === 'REJECTED') {
                throw new Error(`PO is already ${po.status}`);
            }

            if (action === 'REJECT') {
                await client.query(
                    `UPDATE purchase_orders SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2`,
                    [reason, purchaseOrderId]
                );
                
                await client.query(
                    `INSERT INTO po_approval_logs (purchase_order_id, approved_by_user_id, approval_stage) VALUES ($1, $2, $3)`,
                    [purchaseOrderId, userId, -1] // -1 indicates rejection in logs
                );
                
                await client.query('COMMIT');
                return { status: 'REJECTED' };
            }

            // If action is APPROVE
            const currentStage = po.approval_stage || 1;

            // Log this approval
            await client.query(
                `INSERT INTO po_approval_logs (purchase_order_id, approved_by_user_id, approval_stage) VALUES ($1, $2, $3)`,
                [purchaseOrderId, userId, currentStage]
            );

            // Determine if more stages are needed
            // (Assuming department_id is stored on the PO or derived)
            // Note: Replace required_department_id with actual column on your PO table (if different)
            const deptId = po.required_department_id || 1; 

            const matrixRes = await client.query(
                `SELECT * FROM approval_matrices 
                 WHERE department_id = $1 AND min_amount <= $2
                 ORDER BY min_amount ASC`,
                [deptId, po.total_amount]
            );

            // Are there more tiers above this one?
            if (matrixRes.rows.length > currentStage) {
                // Move to next stage
                const nextStage = currentStage + 1;
                const nextStatus = `PENDING_L${nextStage}`;
                const nextApproverRole = matrixRes.rows[nextStage - 1].required_role;

                await client.query(
                    `UPDATE purchase_orders SET approval_stage = $1, status = $2 WHERE id = $3`,
                    [nextStage, nextStatus, purchaseOrderId]
                );

                // Found the next user to notify
                const userRes = await client.query(
                    `SELECT id, is_on_leave, delegated_to_user_id FROM users WHERE role = $1 AND hospital_id = $2 LIMIT 1`,
                    [nextApproverRole, hospitalId]
                );

                if (userRes.rows.length > 0) {
                    let targetUserId = userRes.rows[0].id;
                    if (userRes.rows[0].is_on_leave && userRes.rows[0].delegated_to_user_id) {
                        targetUserId = userRes.rows[0].delegated_to_user_id;
                    }
                    this.sendPushNotification(targetUserId, `PO #${purchaseOrderId} requires L${nextStage} approval. Amount: ${po.total_amount}`);
                }

                await client.query('COMMIT');
                return { status: nextStatus, stage: nextStage };

            } else {
                // All stages passed! Mark as firmly APPROVED
                await client.query(
                    `UPDATE purchase_orders SET status = 'APPROVED', approved_by = $1 WHERE id = $2`,
                    [userId, purchaseOrderId]
                );

                await client.query('COMMIT');
                return { status: 'APPROVED' };
            }

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[ApprovalWorkflow] Process Error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mock the Wolf Ultimate FCM Push Notification trigger
     */
    static sendPushNotification(userId, message) {
        console.log(`\n======================================================`);
        console.log(`📱 [WOLF ULTIMATE FCM MOCK] -> Sending to User ${userId}`);
        console.log(`💬 Message: "${message}"`);
        console.log(`📳 Device vibrates... 'Swipe to Approve' UI loaded.`);
        console.log(`======================================================\n`);
    }
}

module.exports = ApprovalWorkflow;
