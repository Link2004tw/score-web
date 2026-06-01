"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { childSchema, type Child, gradeValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type FormValues = {
  name: string;
  grade: string;
  gender: string;
  score: string;
};

interface ChildFormProps {
  onSubmit: (data: Child) => Promise<void>;
  defaultValues?: Partial<Child>;
  submitLabel?: string;
}

export function ChildForm({ onSubmit, defaultValues, submitLabel = "Submit" }: ChildFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      grade: "",
      gender: "",
      score: "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        grade: defaultValues.grade ?? "",
        gender: defaultValues.gender ?? "",
        score: defaultValues.score != null ? String(defaultValues.score) : "",
      });
    }
  }, [defaultValues, reset]);

  const inputClass = (error?: string) => cn("w-full", error && "border-destructive");

  const onFormSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const parsed = childSchema.safeParse({
        name: data.name,
        grade: data.grade,
        gender: data.gender,
        score: data.score === "" ? undefined : Number(data.score),
      });

      if (!parsed.success) {
        return;
      }

      await onSubmit(parsed.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          {...register("name")}
          className={inputClass(errors.name?.message)}
          placeholder="Student name"
        />
        {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="grade" className="text-sm font-medium">
          Grade
        </label>
        <select
          id="grade"
          {...register("grade")}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.grade && "border-destructive",
          )}
        >
          <option value="">Select...</option>
          {gradeValues.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        {errors.grade && <span className="text-xs text-destructive">{errors.grade.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          {...register("gender")}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            errors.gender && "border-destructive",
          )}
        >
          <option value="">Select...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        {errors.gender && <span className="text-xs text-destructive">{errors.gender.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="score" className="text-sm font-medium">
          Score
        </label>
        <Input
          id="score"
          type="number"
          {...register("score")}
          className={inputClass(errors.score?.message)}
          placeholder="0"
          min={0}
        />
        {errors.score && <span className="text-xs text-destructive">{errors.score.message}</span>}
      </div>

      <Button type="submit" size="lg" className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
